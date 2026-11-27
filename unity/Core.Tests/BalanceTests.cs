using System;
using System.Collections.Generic;
using System.Linq;
using Unjungcheon.Core;
using Xunit;
using Xunit.Abstractions;

public class BalanceTests
{
    readonly ITestOutputHelper output;
    public BalanceTests(ITestOutputHelper output) { this.output = output; }
    static readonly string[] Order = { "heater", "mold", "sign", "oden", "tako", "tteok", "radio", "planter", "helper", "table", "lights", "takoPan" };
    static void BuyInOrder(Simulation s)
    {
        foreach (string key in Order)
        {
            if (s.CanBuy(key)) s.Buy(key);
        }
    }
    static (int scoreSum, int scoreCount) Play(Simulation s, bool active, uint botSeed)
    {
        var bot = new SeedRandom(botSeed);
        double fishEndAt = 0, cookAt = 0;
        int scoreSum = 0, scoreCount = 0;
        double rollAt = -1;
        bool rollHit = false;
        TakoPhase lastPhase = TakoPhase.Empty;
        while (s.Open)
        {
            if (active)
            {
                if (s.Clock >= s.HawkReady) s.Hawk();
                if (s.FrontCustomerId >= 0) s.ServeNow(s.FrontCustomerId);
                var fish = s.Molds[0];
                if ((fish.phase == FishPhase.Empty || (fish.phase == FishPhase.Baking && fish.automatic)) && !fish.holding)
                {
                    if (s.HoldStart(0)) fishEndAt = s.Clock + 0.46 + (bot.Next() - 0.5) * 0.12;
                }
                if (fish.phase == FishPhase.RedBean && !fish.holding && s.HoldStart(0)) fishEndAt = s.Clock + 0.8 + (bot.Next() - 0.5) * 0.12;
                if (fish.phase == FishPhase.Top && !fish.holding && s.HoldStart(0)) fishEndAt = s.Clock + 0.49 + (bot.Next() - 0.5) * 0.12;
                if (fish.holding && s.Clock >= fishEndAt)
                {
                    FishPhase before = fish.phase;
                    s.HoldEnd(0);
                    if (before == FishPhase.Top) cookAt = (bot.Next() < 0.85 ? Balance.FishCookMin : Balance.FishCookMax) + 0.2 + bot.Next() * 0.4;
                }
                if (fish.phase == FishPhase.Baking && !fish.automatic)
                {
                    if (fish.time >= cookAt && s.TakeOut(0)) { scoreSum += s.FishTray[s.FishTray.Count - 1].Basic; scoreCount++; }
                }
                if (s.UpgradeLevel("tako") > 0)
                {
                    if (s.Tako.phase == TakoPhase.Empty) s.PourStart();
                    if (s.Tako.phase == TakoPhase.Pouring && s.Tako.pourTime >= 0.85) s.PourEnd();
                    if (s.Tako.phase == TakoPhase.Octopus) s.AddOctopus();
                    if (s.Tako.phase == TakoPhase.Roll1 || s.Tako.phase == TakoPhase.Roll2)
                    {
                        if (lastPhase != s.Tako.phase) { rollHit = bot.Next() < 0.85; rollAt = (rollHit ? 4 : 8) + 0.2 + bot.Next() * 0.4; }
                        if (s.Tako.time >= rollAt) s.Roll();
                    }
                    if (s.Tako.phase == TakoPhase.Sauce) s.Sauce();
                    lastPhase = s.Tako.phase;
                }
                if (s.UpgradeLevel("oden") > 0 && s.Clock >= s.OdenReady) s.RefillOden();
                if (s.UpgradeLevel("tteok") > 0 && s.Clock >= s.StirReady) s.StirTteok();
            }
            s.Tick(0.1);
        }
        return (scoreSum, scoreCount);
    }
    [Fact, Trait("Category", "Balance")]
    public void HelperLevelTwoImprovesIdleButStaysBelowActive()
    {
        double unstaffed = 0, staffed = 0, activeTotal = 0;
        for (uint seed = 1; seed <= 20; seed++)
        {
            var baseSim = new Simulation(new SeedRandom(seed + 500));
            var state = baseSim.Snapshot(); state.day = 40; state.stats.day = 40;
            state.upgrades[4] = 1; state.upgrades[3] = 1; state.upgrades[5] = 1;
            var no = new Simulation(new SeedRandom(1)); no.Restore(state);
            var yes = new Simulation(new SeedRandom(1)); yes.Restore(state);
            var direct = new Simulation(new SeedRandom(1)); direct.Restore(state);
            var staffedState = yes.Snapshot(); staffedState.upgrades[6] = 2;
            yes.Restore(staffedState); direct.Restore(staffedState);
            Play(no, false, seed + 1500); Play(yes, false, seed + 1500); Play(direct, true, seed + 1500);
            unstaffed += no.Report.profit; staffed += yes.Report.profit; activeTotal += direct.Report.profit;
        }
        output.WriteLine($"helper_seed_count=20 no_staff_mean={unstaffed/20:F0} level2_idle_mean={staffed/20:F0} level2_active_mean={activeTotal/20:F0}");
        Assert.True(staffed > unstaffed);
        Assert.True(activeTotal > staffed);
    }
    [Fact, Trait("Category", "Balance")]
    public void EightyDayGoals()
    {
        const int seeds = 20;
        double[] idleSum = new double[3], activeSum = new double[3];
        int[] stationOpenCount = new int[3];
        var measuredStates = new[] { new HashSet<uint>(), new HashSet<uint>(), new HashSet<uint>() };
        int minIdle = int.MaxValue, helperGain = 0, helperSamples = 0;
        double offlineRatio = 0;
        int activeHomeSum = 0, idleHomeSum = 0, activeHomeMax = 0, idleHomeMax = 0, activeStationSum = 0, idleStationSum = 0, activeStationMax = 0, idleStationMax = 0;
        int qualitySum = 0, qualityCount = 0;
        for (uint seed = 1; seed <= seeds; seed++)
        {
            var idle = new Simulation(new SeedRandom(seed));
            var active = new Simulation(new SeedRandom(seed));
            int activeHomeDay = 0, idleHomeDay = 0, activeStationDay = 0, idleStationDay = 0;
            for (int day = 1; day <= 160; day++)
            {
                if (active.StationUnlocked) active.SetActiveLocation(Location.PangyoStation);
                BuyInOrder(idle); BuyInOrder(active);
                if (day == 1 || day == 20 || day == 40)
                {
                    int index = day == 1 ? 0 : day == 20 ? 1 : 2;
                    var morning = idle.Snapshot();
                    if (day == 40) { morning.stationUnlocked = true; morning.activeLocation = (int)Location.PangyoStation; }
                    if (morning.stationUnlocked) stationOpenCount[index]++;
                    measuredStates[index].Add(morning.randomState);
                    var measureIdle = new Simulation(new SeedRandom(seed + 5000)); measureIdle.Restore(morning);
                    var measureActive = new Simulation(new SeedRandom(seed + 5000)); measureActive.Restore(morning);
                    Assert.Equal(morning.randomState, measureIdle.Snapshot().randomState);
                    Assert.Equal(morning.randomState, measureActive.Snapshot().randomState);
                    Play(measureIdle, false, seed + 1000); Play(measureActive, true, seed + 1000);
                    idleSum[index] += measureIdle.Report.profit; activeSum[index] += measureActive.Report.profit;
                    if (seed == 1) output.WriteLine($"detail day={day} idle sold={measureIdle.Report.sold} missed={measureIdle.Report.missed} upgrade={string.Join(',', morning.upgrades)} active sold={measureActive.Report.sold} missed={measureActive.Report.missed} station={morning.stationUnlocked}");
                }
                Play(idle, false, seed + 1000); var quality = Play(active, true, seed + 1000);
                qualitySum += quality.scoreSum; qualityCount += quality.scoreCount;
                if (day <= 80) minIdle = Math.Min(minIdle, idle.Report.profit);
                if (idle.StationUnlocked && idleStationDay == 0) idleStationDay = day;
                if (active.StationUnlocked && activeStationDay == 0) activeStationDay = day;
                if (idle.HomeReached && idleHomeDay == 0) idleHomeDay = day;
                if (active.HomeReached && activeHomeDay == 0) activeHomeDay = day;
                if (day == 40 && idle.Report.profit > 0) offlineRatio += idle.OfflineHourlyProfit * Balance.OfflineShare * Balance.OfflineCapHours / idle.Report.profit;
                if (day == 40 && idle.UpgradeLevel("helper") == 2) { helperGain += idle.Report.profit; helperSamples++; }
                if (day == 160 || (day >= 80 && activeHomeDay > 0 && idleHomeDay > 0)) break;
                idle.NextDay(); active.NextDay();
            }
            Assert.True(activeHomeDay > 0 && idleHomeDay > 0);
            activeHomeSum += activeHomeDay; idleHomeSum += idleHomeDay;
            activeHomeMax = Math.Max(activeHomeMax, activeHomeDay); idleHomeMax = Math.Max(idleHomeMax, idleHomeDay);
            activeStationSum += activeStationDay; idleStationSum += idleStationDay;
            activeStationMax = Math.Max(activeStationMax, activeStationDay); idleStationMax = Math.Max(idleStationMax, idleStationDay);
        }
        Assert.All(measuredStates, states => Assert.Equal(seeds, states.Count));
        for (int i = 0; i < 3; i++) output.WriteLine($"day={new[]{1,20,40}[i]} seeds={seeds} idle={idleSum[i]/seeds:F0} active={activeSum[i]/seeds:F0} ratio={activeSum[i]/idleSum[i]:F3} station_open={stationOpenCount[i]}/{seeds}");
        output.WriteLine($"idle_min={minIdle} helper_lv2_samples={helperSamples} helper_lv2_mean={((double)helperGain/Math.Max(1,helperSamples)):F0} offline_ratio={offlineRatio/seeds:F3}");
        output.WriteLine($"home_active_mean={(double)activeHomeSum/seeds:F1} home_active_max={activeHomeMax} home_idle_mean={(double)idleHomeSum/seeds:F1} home_idle_max={idleHomeMax}");
        output.WriteLine($"station_active_mean={(double)activeStationSum/seeds:F1} station_active_max={activeStationMax} station_idle_mean={(double)idleStationSum/seeds:F1} station_idle_max={idleStationMax} active_quality_mean={(double)qualitySum/qualityCount:F1} samples={qualityCount}");
        Assert.True(minIdle > 0);
        for (int i = 0; i < 3; i++) Assert.InRange(activeSum[i] / idleSum[i], 1.6, 2.0);
        Assert.InRange(offlineRatio / seeds, 0.5, 1.5);
        Assert.InRange((double)activeHomeSum / seeds, 70, 90);
        Assert.True(idleHomeSum > activeHomeSum);
        Assert.InRange((double)qualitySum / qualityCount, 70, 80);
    }
}
