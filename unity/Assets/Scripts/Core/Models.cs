using System;

namespace Unjungcheon.Core
{
    public interface IRandom { double Next(); uint State { get; set; } }

    public sealed class SeedRandom : IRandom
    {
        public uint State { get; set; }
        public SeedRandom(uint seed) { State = seed == 0 ? 1u : seed; }
        public double Next() { uint x = State; x ^= x << 13; x ^= x >> 17; x ^= x << 5; State = x; return x / 4294967296.0; }
    }

    public enum Weather { Clear, Snow, Rain }
    public enum Menu { Fish, Oden, Tako, Tteok }
    public enum CustomerPhase { Browse, Queue, Serve, Leave }
    public enum TakoPhase { Empty, Pouring, Octopus, Roll1, Roll2, Sauce, Complete }
    public enum FishPhase { Empty, Bottom, RedBean, Top, Baking }
    public enum Location { Skala, PangyoStation }
    public enum SimEventKind { BakeComplete, Sale, Combo, FavorStage, TakoComplete, LocationUnlocked, HomeReached }

    public sealed class QualityScore
    {
        public int batter, filling, cook, creativity;
        public string[] ingredients = new string[0];
        public int Basic => batter + filling + cook;
        public int Total => Basic + creativity;
        public int Price(int basePrice) => (int)Math.Round(basePrice * (Balance.QualityPriceFloor + Balance.QualityPriceRange * Basic / Balance.BasicQualityMax) * (1 + creativity / Balance.CreativityPriceScale), MidpointRounding.AwayFromZero);
        public QualityScore Copy() => new QualityScore { batter = batter, filling = filling, cook = cook, creativity = creativity, ingredients = (string[])ingredients.Clone() };
    }

    public sealed class SimEvent
    {
        public SimEventKind kind;
        public int id;
        public int value;
    }

    public sealed class DayReport
    {
        public int day, customers, sold, revenue, cost, profit, missed, shortfall;
        public Weather weather, tomorrow;
        public DayReport Copy() => (DayReport)MemberwiseClone();
    }

    public sealed class MoldState
    {
        public FishPhase phase;
        public bool automatic, holding;
        public double time, cooldown, holdStart, bottomAmount, fillingAmount, topAmount;
        public MoldState Copy() => (MoldState)MemberwiseClone();
    }

    public sealed class TakoState
    {
        public TakoPhase phase;
        public double time, pourTime;
        public int rollsHit;
        public bool pourValid;
        public bool automatic;
        public TakoState Copy() => (TakoState)MemberwiseClone();
    }

    public sealed class CustomerState
    {
        public int id, residentIndex, quantity;
        public Menu menu;
        public CustomerPhase phase;
        public double timer, patience;
        public bool servedNow;
        public CustomerState Copy() => (CustomerState)MemberwiseClone();
    }

    // Public fields and arrays are compatible with Unity JsonUtility.
    // A day start contains only the state needed to replay a day's simulation.
    public class DayStartData
    {
        public uint randomState;
        public int day, money, nextCustomerId, combo, odenStock, tteokStock, takoStock, takoGoodStock, takoBalls;
        public int[] upgrades, visits;
        public QualityScore[] fishTray;
        public double dayTime, clock, spawnTimer, tteokTime;
        public double hawkUntil, hawkReady, takoReady, odenBoostUntil, odenReady, stirReady;
        public double[] talkReady;
        public int[] talkCount;
        public Weather weather, tomorrow;
        public bool open, tteokCooking;
        public MoldState[] molds;
        public TakoState tako;
        public CustomerState[] customers;
        public DayReport stats;
        public int activeLocation;
        public bool stationUnlocked;

        public DayStartData Copy() => new DayStartData {
            randomState = randomState, day = day, money = money, nextCustomerId = nextCustomerId, combo = combo,
            odenStock = odenStock, tteokStock = tteokStock, takoStock = takoStock, takoGoodStock = takoGoodStock,
            takoBalls = takoBalls, upgrades = (int[])upgrades.Clone(), visits = (int[])visits.Clone(),
            fishTray = Array.ConvertAll(fishTray, x => x.Copy()), dayTime = dayTime, clock = clock,
            spawnTimer = spawnTimer, tteokTime = tteokTime, hawkUntil = hawkUntil, hawkReady = hawkReady,
            takoReady = takoReady, odenBoostUntil = odenBoostUntil, odenReady = odenReady, stirReady = stirReady,
            talkReady = (double[])talkReady.Clone(), talkCount = (int[])talkCount.Clone(), weather = weather,
            tomorrow = tomorrow, open = open, tteokCooking = tteokCooking,
            molds = Array.ConvertAll(molds, x => x.Copy()), tako = tako.Copy(),
            customers = Array.ConvertAll(customers, x => x.Copy()), stats = stats.Copy(),
            activeLocation = activeLocation, stationUnlocked = stationUnlocked
        };
    }

    public sealed class SaveData : DayStartData
    {
        public double offlineHourlyProfit;
        public DayReport report;
        public DayStartData dayStart;
        public int homeFund, cumulativeProfit;
        public bool homeReached;
        public double savingsRate;
    }
}
