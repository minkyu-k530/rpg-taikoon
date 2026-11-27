namespace Unjungcheon.Core
{
    public static class Balance
    {
        // Web config.ts: dayLength, startMoney, bake, oden, tteok, spawn and upgrades.
        public const double DayLength = 150;
        public const int StartMoney = 20000;
        public const int FishCost = 300, FishPrice = 1000;
        // Web config.ts flipWindow is retired by GDD v4-10 hold cooking.
        public const double FishAutoTime = 14, FishAutoBurnTime = 30;
        public const double FishHoldRate = 1;
        public const double FishBatterMin = 0.9, FishBatterMax = 1.0, FishFillingMin = 0.7, FishFillingMax = 0.9;
        public const double FishCookMin = 18, FishCookMax = 22;
        public const double FishMaxBatterPenaltyScale = 100, FishMaxFillingPenaltyScale = 100, FishCookPenaltyScale = 5;
        public const int FishAutoMin0 = 40, FishAutoMax0 = 55, FishAutoMin1 = 50, FishAutoMax1 = 62, FishAutoMin2 = 58, FishAutoMax2 = 68;
        public const int FishBatterPoints = 20, FishFillingPoints = 20, FishCookPoints = 40;
        public const int BasicQualityMax = 80, HighScoreCombo = 70;
        public const double QualityPriceFloor = 0.7, QualityPriceRange = 0.6, CreativityPriceScale = 100;
        public const int FishTrayBaseCapacity = 6;
        public const double FishRestartMin = 0.4, FishRestartMax = 1.6;
        public const int OdenCost = 400, OdenPrice = 1000;
        public const int TteokCost = 1200, TteokPrice = 4000, TteokBatch = 4;
        public const double TteokTime = 40;
        public const double SpawnInterval = 2.5, BuyChance = 0.18, BrowseChance = 0.3;
        public const double HeaterBuyBonus = 0.05, OdenPickChance = 0.4, TteokPickChance = 0.25;
        public const double TakoPickChance = 0.18;
        public const double SignSpawnBonus = 0.3, PlanterSpawnBonus = 0.1, LightsSpawnBonus = 0.12;
        public const double RadioBuyBonus = 0.03, RegularStageBuyBonus = 0.08;
        public const double RollStart = 4, RollEnd = 8, PourMin = 0.8, PourMax = 1;
        public const int TakoBaseHoles = 16, TakoExtraHoles = 8, TakoBallsPerPlate = 6;
        public const double WeatherClearChance = 0.68, WeatherSnowChance = 0.16;
        public const int QueueMax = 6;
        public const double Patience = 14;
        public const int BaseMolds = 2;
        // GDD v4-3 and v4-5: good quality +30%, takoyaki portions, offline share.
        public const double GoodMultiplier = 1.3, OfflineShare = 0.5, OfflineCapHours = 8, OfflineDayHours = 4;
        public const int TakoPrice = 4000, TakoCost = 1400;
        public const double TakoAutoLevel0 = 150, TakoAutoLevel1 = 90, TakoAutoLevel2 = 60;
        public const double MaxManualSpeedMultiplier = 1.5;
        public const double HawkDuration = 10, HawkCooldown = 30;
        public const double HawkSpawnMultiplier = 1.4, ServeTime = 1.2;
        public const int ServeTip = 700;
        public const int MaxCustomersOnSite = 22;
        public const double SpawnJitterMin = 0.6, SpawnJitterMax = 1.4;
        public const double BrowseTime = 3, BrowseConvertChance = 0.25;
        public const double SkalaSpawnMultiplier = 1, StationSpawnMultiplier = 1.8;
        public const double SkalaPeakStart = 0.35, SkalaPeakEnd = 0.55, StationPeakStart = 0.2, StationPeakEnd = 0.4, PeakMultiplier = 1.15;
        public const int StationProfitUnlock = 500000, StationRegularsUnlock = 3;
        public const int StationRegularStage = 2, NamedRegularCount = 8;
        public const int HomeGoal = 6000000;
        public const double DefaultSavingsRate = 0.3;
        public const double TalkCooldown = 30;
        public const int TalkDailyLimit = 1;
        public const double OdenBoostDuration = 15, OdenBoostCooldown = 30;
        public const double OdenBoostMultiplier = 1.4, TteokStirReduction = 8, TteokStirCooldown = 15;
        public static readonly string[] UpgradeKeys = { "mold", "sign", "heater", "oden", "tako", "tteok", "helper", "radio", "planter", "table", "lights", "takoPan" };
        public static readonly int[] UpgradeBase = { 18000, 15000, 12000, 25000, 30000, 60000, 45000, 80000, 150000, 400000, 700000, 90000 };
        public static readonly double[] UpgradeMultiplier = { 1.9, 2.2, 2, 1, 1, 1, 2.4, 1, 1, 1, 1, 2 };
        public static readonly int[] UpgradeMax = { 6, 3, 3, 1, 1, 1, 2, 1, 1, 1, 1, 2 };
        public static readonly int[] UpgradeUnlockDay = { 1, 1, 1, 7, 9, 19, 38, 25, 35, 46, 60, 9 };
        // Web weather.ts spawn, buy, linger multipliers in clear/snow/rain order.
        public static readonly double[] WeatherSpawn = { 1, 0.95, 0.82 };
        public static readonly double[] WeatherBuy = { 1, 1.5, 1.3 };
        public static readonly double[] WeatherLinger = { 1, 1.2, 1.4 };
        // Web residents.ts FAVOR_STAGES thresholds.
        public static readonly int[] FavorVisits = { 0, 3, 7, 15, 30 };
        public static readonly string[] ResidentIds = { "seungwoo", "haram", "dogyeong", "youngsook", "siyeon", "jaemin", "jiwoo", "panseok", "passerby-0", "passerby-1", "passerby-2", "passerby-3", "passerby-4", "passerby-5", "passerby-6", "passerby-7", "passerby-8", "passerby-9", "passerby-10", "passerby-11" };
        public static int UpgradeCost(int index, int level) => (int)(System.Math.Round(UpgradeBase[index] * System.Math.Pow(UpgradeMultiplier[index], level) / 100, System.MidpointRounding.AwayFromZero) * 100);
    }
}
