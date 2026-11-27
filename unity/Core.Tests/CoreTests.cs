using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Unjungcheon.Core;
using Xunit;

public class CoreTests
{
    static Simulation New(uint seed = 1) => new Simulation(new SeedRandom(seed));
    static void Advance(Simulation s, double seconds) { for (int i = 0; i < (int)(seconds * 10); i++) s.Tick(0.1); }

    [Fact] public void SaveDataTypeGraphHasNoCyclesAndDayStartIsCopied()
    {
        var path = new HashSet<Type>();
        var visited = new HashSet<Type>();
        bool Acyclic(Type type)
        {
            if (type.IsArray) return Acyclic(type.GetElementType()!);
            if (type.IsPrimitive || type.IsEnum || type == typeof(string)) return true;
            if (path.Contains(type)) return false;
            if (!visited.Add(type)) return true;
            path.Add(type);
            bool valid = type.GetFields(BindingFlags.Instance | BindingFlags.Public).All(field => Acyclic(field.FieldType));
            path.Remove(type);
            return valid;
        }
        Assert.Equal(typeof(DayStartData), typeof(SaveData).GetField("dayStart")!.FieldType);
        Assert.True(Acyclic(typeof(SaveData)));

        var s = New(); s.Tick(0.1);
        var saved = s.Snapshot();
        saved.dayStart!.upgrades[0] = 99;
        saved.dayStart.molds[0].phase = FishPhase.Top;
        Assert.Equal(0, s.Snapshot().dayStart!.upgrades[0]);
        Assert.Equal(FishPhase.Empty, s.Snapshot().dayStart!.molds[0].phase);
        var restored = New(99); restored.Restore(s.Snapshot());
        var source = s.Snapshot(); restored.Restore(source);
        source.dayStart!.visits[0] = 99;
        Assert.Equal(0, restored.Snapshot().dayStart!.visits[0]);
    }

    [Fact] public void NewDayClearsInterruptedFishAndTakoyakiAndDailyTimers()
    {
        var s = New(); s.SetDayForTesting(9); s.Restore(Fund(s, 100000));
        Assert.True(s.Buy("tako")); Assert.True(s.Buy("oden"));
        Advance(s, 149.8);
        Assert.True(s.HoldStart(0)); Assert.True(s.PourStart());
        Assert.True(s.Hawk()); Assert.True(s.RefillOden());
        var state = s.Snapshot();
        state.stirReady = state.clock + 100;
        state.talkReady[1] = state.clock + 100;
        state.talkCount[1] = 1;
        state.customers = new[] { new CustomerState { id = 777, residentIndex = 1, phase = CustomerPhase.Serve, menu = Menu.Fish, timer = 1, patience = 10 } };
        s.Restore(state);
        Advance(s, 0.2);
        Assert.False(s.Open); Assert.True(s.NextDay());
        Assert.Empty(s.Customers);
        Assert.All(s.Molds, m => { Assert.Equal(FishPhase.Empty, m.phase); Assert.False(m.holding); });
        Assert.Equal(TakoPhase.Empty, s.Tako.phase);
        var fresh = s.Snapshot();
        Assert.Equal(0, fresh.hawkUntil); Assert.Equal(0, fresh.odenBoostUntil);
        Assert.Equal(0, fresh.stirReady); Assert.Equal(0, fresh.takoReady);
        Assert.Equal(0, fresh.talkReady[1]); Assert.Equal(0, fresh.talkCount[1]);
        Assert.True(s.Hawk()); Assert.True(s.RefillOden());
        Assert.True(s.HoldStart(0)); Assert.True(s.HoldEnd(0));
        Assert.Equal(FishPhase.RedBean, s.Molds[0].phase);
        Assert.True(s.PourStart());
        Assert.True(s.PourEnd());
        Assert.True(s.AddOctopus());
        Assert.True(s.Roll()); Assert.True(s.Roll()); Assert.True(s.Sauce());
        Assert.True(s.TakoStock > 0);

        var auto = New(); auto.SetDayForTesting(38); auto.Restore(Fund(auto, 100000)); auto.Buy("tako"); auto.Buy("helper");
        Advance(auto, 149.8); auto.HoldStart(0); auto.PourStart(); Advance(auto, 0.2);
        Assert.True(auto.NextDay());
        int autoTakoComplete = 0, firstMoldComplete = 0;
        auto.OnEvent += e => {
            if (e.kind == SimEventKind.TakoComplete) autoTakoComplete++;
            if (e.kind == SimEventKind.BakeComplete && e.id == 0) firstMoldComplete++;
        };
        Advance(auto, 60);
        Assert.True(firstMoldComplete > 0);
        Advance(auto, 40);
        Assert.True(autoTakoComplete > 0);
    }

    [Fact] public void NewDayClearsComboWhileFishIsInProgress()
    {
        var s = New();
        var state = s.Snapshot(); state.combo = 3; s.Restore(state);
        s.Tick(Balance.DayLength - 0.2);
        Assert.True(s.HoldStart(0));
        Assert.Equal(FishPhase.Bottom, s.Molds[0].phase);
        Assert.Equal(3, s.Combo);
        s.Tick(0.2);
        Assert.False(s.Open);
        Assert.True(s.NextDay());
        Assert.Equal(0, s.Combo);
    }

    [Fact] public void FailedImmediateServeNeverPaysTip()
    {
        var s = New(); var state = s.Snapshot();
        state.fishTray = Array.Empty<QualityScore>();
        state.customers = new[] { new CustomerState { id = 42, residentIndex = 0, phase = CustomerPhase.Serve, menu = Menu.Fish, timer = 1, patience = 14 } };
        s.Restore(state);
        Assert.False(s.ServeNow(42));
        Assert.False(s.Customers[0].servedNow);
        Assert.Equal(0, s.Stats.revenue);
        s.FishTray.Add(new QualityScore { batter = 20, filling = 20, cook = 40 });
        s.Tick(Balance.ServeTime + 0.2);
        Assert.Equal(1300, s.Stats.revenue);
    }

    [Fact] public void SameSeedGivesSameReport()
    {
        var a = New(17); var b = New(17);
        Advance(a, 150); Advance(b, 150);
        Assert.Equal(a.Report.revenue, b.Report.revenue);
        Assert.Equal(a.Report.cost, b.Report.cost);
        Assert.Equal(a.Report.customers, b.Report.customers);
    }
    [Fact] public void FishCookingOrderAndScore()
    {
        var s = New(); Assert.False(s.HoldEnd(0)); Assert.False(s.TakeOut(0));
        Assert.True(s.HoldStart(0)); Advance(s, 0.45); Assert.True(s.HoldEnd(0));
        Assert.Equal(FishPhase.RedBean, s.Molds[0].phase);
        Assert.True(s.HoldStart(0)); Advance(s, 0.8); s.HoldEnd(0);
        Assert.True(s.HoldStart(0)); Advance(s, 0.5); s.HoldEnd(0);
        Assert.Equal(FishPhase.Baking, s.Molds[0].phase);
        Advance(s, 19); Assert.True(s.TakeOut(0));
        Assert.Equal(80, s.FishTray.Last().Basic);
        Assert.Equal(1300, s.FishTray.Last().Price(1000));
        Assert.Equal(1, s.Combo);
        Assert.False(s.TakeOut(0));
    }
    [Fact] public void FishScoreBoundariesAndPriceFormula()
    {
        var q = new QualityScore { batter = 20, filling = 20, cook = 40, creativity = 20 };
        Assert.Equal(1560, q.Price(1000));
        Assert.Equal(700, new QualityScore().Price(1000));
        var s = New();
        s.HoldStart(0); Advance(s, 1.2); s.HoldEnd(0);
        s.HoldStart(0); Advance(s, 0.1); s.HoldEnd(0);
        s.HoldStart(0); Advance(s, 1.2); s.HoldEnd(0);
        Advance(s, 29); s.TakeOut(0);
        Assert.True(s.FishTray.Last().Basic < 40);
        Assert.Empty(s.FishTray.Last().ingredients);
    }
    [Fact] public void AutomaticFishQualityRanges()
    {
        for (int level = 0; level <= 2; level++)
        {
            var s = New((uint)(level + 5));
            var data = s.Snapshot(); data.upgrades[6] = level; s.Restore(data);
            var scores = new List<int>();
            s.OnEvent += e => { if (e.kind == SimEventKind.BakeComplete) scores.Add(e.value); };
            Advance(s, 60);
            int min = level == 0 ? Balance.FishAutoMin0 : level == 1 ? Balance.FishAutoMin1 : Balance.FishAutoMin2;
            int max = level == 0 ? Balance.FishAutoMax0 : level == 1 ? Balance.FishAutoMax1 : Balance.FishAutoMax2;
            Assert.NotEmpty(scores); Assert.All(scores, x => Assert.InRange(x, min, max));
        }
    }
    [Fact] public void TakoyakiOrderQualityAndUnlock()
    {
        var s = New(); Assert.False(s.PourStart()); Assert.False(s.CanBuy("tako"));
        s.SetDayForTesting(9); s.Restore(Fund(s, 100000)); Assert.True(s.Buy("tako"));
        Assert.False(s.Roll()); Assert.True(s.PourStart());
        Assert.False(s.AddOctopus()); Advance(s, 0.9); Assert.True(s.PourEnd());
        Assert.True(s.AddOctopus()); Advance(s, 5); Assert.True(s.Roll());
        Advance(s, 5); Assert.True(s.Roll()); Assert.True(s.Sauce());
        Assert.True(s.TakoGoodStock > 0);
        var ordinary = New(); ordinary.SetDayForTesting(9); ordinary.Restore(Fund(ordinary, 100000)); ordinary.Buy("tako");
        Assert.True(ordinary.PourStart()); Advance(ordinary, 0.9); ordinary.PourEnd(); ordinary.AddOctopus();
        ordinary.Roll(); ordinary.Roll(); ordinary.Sauce();
        Assert.True(ordinary.TakoStock > ordinary.TakoGoodStock);
    }
    [Fact] public void TakoyakiAutoTimes()
    {
        var s = New(); s.SetDayForTesting(38); s.Restore(Fund(s, 100000));
        Assert.True(s.Buy("tako")); Assert.True(s.Buy("helper"));
        Advance(s, 89); Assert.Equal(0, s.TakoStock);
        Advance(s, 2); Assert.True(s.TakoStock > 0);
        var t = New(); t.SetDayForTesting(38); t.Restore(Fund(t, 200000)); t.Buy("tako"); t.Buy("helper"); t.Buy("helper");
        Advance(t, 59); Assert.Equal(0, t.TakoStock);
        Advance(t, 2); Assert.True(t.TakoStock > 0);
    }
    static SaveData Fund(Simulation s, int money) { var d = s.Snapshot(); d.money = money; return d; }
    [Fact] public void DirectActionsAndCooldown()
    {
        var s = New(); Assert.True(s.Hawk()); Assert.False(s.Hawk());
        Assert.False(s.Talk("haram"));
        var present = s.Snapshot(); present.customers = new[] { new CustomerState { id = 1, residentIndex = 1, phase = CustomerPhase.Browse, timer = 100 } }; s.Restore(present);
        Assert.True(s.Talk("haram")); Assert.False(s.Talk("haram")); Assert.Equal(1, s.VisitCount("haram"));
        Advance(s, 31); Assert.True(s.Hawk());
        var later = New(); later.SetDayForTesting(7); later.Restore(Fund(later, 100000)); Assert.True(later.Buy("oden"));
        Assert.True(later.RefillOden()); Assert.False(later.RefillOden());
    }
    [Fact] public void ServeNowPaysTipAndHawkBringsVisitors()
    {
        var s = New(); var state = s.Snapshot();
        state.fishTray = new[] { new QualityScore { batter = 20, filling = 20, cook = 40 } };
        state.customers = new[] { new CustomerState { id = 42, residentIndex = 0, phase = CustomerPhase.Serve, menu = Menu.Fish, timer = 1, patience = 14 } };
        s.Restore(state);
        Assert.False(s.ServeNow(41)); Assert.True(s.ServeNow(42));
        Assert.Equal(1300 + Balance.ServeTip, s.Stats.revenue);
        var idle = New(33); var active = New(33); active.Hawk();
        idle.Tick(0.1); active.Tick(0.1);
        Assert.True(active.Snapshot().spawnTimer < idle.Snapshot().spawnTimer);
    }
    [Fact] public void OfflineCapAndZero()
    {
        var s = New(); Advance(s, 150);
        Assert.Equal(0, s.OfflineEarnings(TimeSpan.Zero));
        Assert.Equal(s.OfflineEarnings(TimeSpan.FromHours(8)), s.OfflineEarnings(TimeSpan.FromHours(20)));
    }
    [Fact] public void SnapshotRestoresInProgressState()
    {
        var a = New(); a.SetDayForTesting(9); a.Restore(Fund(a, 100000)); Assert.True(a.Buy("tako")); Assert.True(a.PourStart());
        Assert.True(a.HoldStart(0)); Advance(a, 0.5);
        var saved = a.Snapshot(); var b = New(999); b.Restore(saved);
        Assert.Equal(saved.tako.phase, b.Tako.phase);
        Assert.Equal(saved.tako.pourTime, b.Tako.pourTime);
        Assert.Equal(saved.molds[0].time, b.Molds[0].time);
        Assert.Equal(FishPhase.Bottom, b.Molds[0].phase);
        Assert.True(b.Molds[0].holding);
        Advance(a, 15); Advance(b, 15);
        Assert.Equal(a.Snapshot().randomState, b.Snapshot().randomState);
        Assert.Equal(a.Snapshot().fishTray.Select(x => x.Basic), b.Snapshot().fishTray.Select(x => x.Basic));
        Assert.Equal(a.Snapshot().homeFund, b.Snapshot().homeFund);
        Assert.Equal(a.Snapshot().upgrades, b.Snapshot().upgrades);
        Assert.Equal(a.Snapshot().visits, b.Snapshot().visits);
        Assert.Equal(a.Snapshot().customers.Length, b.Snapshot().customers.Length);
    }
    [Fact] public void EventsArrive()
    {
        var s = New(); var events = new List<SimEventKind>(); s.OnEvent += e => events.Add(e.kind);
        s.HoldStart(0); Advance(s, 0.45); s.HoldEnd(0);
        s.HoldStart(0); Advance(s, 0.8); s.HoldEnd(0);
        s.HoldStart(0); Advance(s, 0.5); s.HoldEnd(0);
        Advance(s, 19); s.TakeOut(0);
        Assert.Contains(SimEventKind.Combo, events);
        Assert.Contains(SimEventKind.BakeComplete, events);
    }
    [Fact] public void StationUnlockAndInactiveRevenue()
    {
        var locked = New(); Assert.False(locked.SetActiveLocation(Location.PangyoStation));
        var data = locked.Snapshot(); data.cumulativeProfit = Balance.StationProfitUnlock;
        var noRegulars = New(); noRegulars.Restore(data); Advance(noRegulars, 150); Assert.False(noRegulars.StationUnlocked);
        for (int i = 0; i < Balance.StationRegularsUnlock; i++) data.visits[i] = 7;
        locked.Restore(data);
        var events = new List<SimEventKind>(); locked.OnEvent += e => events.Add(e.kind);
        Advance(locked, 150); Assert.True(locked.StationUnlocked);
        Assert.Contains(SimEventKind.LocationUnlocked, events);
        Assert.True(locked.SetActiveLocation(Location.PangyoStation));
        var both = New(7); var one = New(7);
        var a = both.Snapshot(); a.stationUnlocked = true; both.Restore(a);
        Advance(both, 150); Advance(one, 150);
        Assert.True(both.Report.profit > one.Report.profit);
    }
    [Fact] public void HomeFundSavingsAndEvent()
    {
        var s = New(); var d = s.Snapshot(); d.homeFund = Balance.HomeGoal - 1000; s.Restore(d);
        Assert.True(s.SetSavingsRate(0.5)); Assert.False(s.SetSavingsRate(2));
        var events = new List<SimEventKind>(); s.OnEvent += e => events.Add(e.kind);
        Advance(s, 150);
        Assert.Equal(Balance.HomeGoal - 1000 + (int)Math.Round(s.Report.profit * 0.5, MidpointRounding.AwayFromZero), s.HomeFund);
        Assert.True(s.HomeReached); Assert.Contains(SimEventKind.HomeReached, events);
    }
}
