using System;
using System.Collections.Generic;

namespace Unjungcheon.Core
{
    public sealed class Simulation
    {
        public event Action<SimEvent> OnEvent;
        readonly IRandom random;
        public int Day { get; private set; } = 1;
        public int Money { get; private set; } = Balance.StartMoney;
        public double DayTime { get; private set; }
        public double Clock { get; private set; }
        public bool Open { get; private set; } = true;
        public Weather Weather { get; private set; }
        public Weather Tomorrow { get; private set; }
        public DayReport Stats { get; private set; } = new DayReport();
        public DayReport Report { get; private set; }
        public readonly int[] Upgrades = new int[Balance.UpgradeKeys.Length];
        public readonly int[] Visits = new int[20];
        public readonly List<MoldState> Molds = new List<MoldState>();
        public readonly List<CustomerState> Customers = new List<CustomerState>();
        public readonly List<QualityScore> FishTray = new List<QualityScore>();
        public TakoState Tako { get; private set; } = new TakoState();
        public int Combo { get; private set; }
        public int OdenStock { get; private set; }
        public int TteokStock { get; private set; }
        public int TakoStock { get; private set; }
        public int TakoGoodStock { get; private set; }
        int takoBalls;
        public double OfflineHourlyProfit { get; private set; }
        public Location ActiveLocation { get; private set; } = Location.Skala;
        public bool StationUnlocked { get; private set; }
        public int CumulativeProfit { get; private set; }
        public int HomeFund { get; private set; }
        public bool HomeReached { get; private set; }
        public double SavingsRate { get; private set; } = Balance.DefaultSavingsRate;
        public int Reputation { get; private set; } = 50;
        public int EmployeeLoyalty { get; private set; }
        public int Glares { get; private set; }
        public double GuardBanUntil { get; private set; }
        public GroupOrderState GroupOrder { get; private set; }
        double glareDecayAt;
        public bool CampusInviteBanned => Clock < GuardBanUntil;
        public double HawkReady => hawkReady;
        public double InviteReady => inviteReady;
        public double OdenReady => odenReady;
        public double StirReady => stirReady;
        public int FrontCustomerId
        {
            get { foreach (CustomerState c in Customers) if (c.phase == CustomerPhase.Serve) return c.id; return -1; }
        }
        double spawnTimer, tteokTime, hawkUntil, hawkReady, inviteReady, odenBoostUntil, odenReady, stirReady;
        double takoReady;
        double[] talkReady = new double[20];
        int[] talkCount = new int[20];
        bool tteokCooking;
        bool shadowMode;
        DayStartData dayStart;
        int nextCustomerId = 1;

        public Simulation(IRandom random)
        {
            this.random = random ?? throw new ArgumentNullException(nameof(random));
            Weather = RollWeather(); Tomorrow = RollWeather();
            ResetMolds();
            Stats.day = Day;
        }

        void Emit(SimEventKind kind, int id = 0, int value = 0) => OnEvent?.Invoke(new SimEvent { kind = kind, id = id, value = value });
        double Rand(double a, double b) => a + random.Next() * (b - a);
        Weather RollWeather()
        {
            double r = random.Next();
            return r < Balance.WeatherClearChance ? Weather.Clear : r < Balance.WeatherClearChance + Balance.WeatherSnowChance ? Weather.Snow : Weather.Rain;
        }
        public int FavorStage(int resident)
        {
            if (resident < 0 || resident >= Visits.Length) return 0;
            int stage = 0;
            for (int i = 1; i < Balance.FavorVisits.Length; i++) if (Visits[resident] >= Balance.FavorVisits[i]) stage = i;
            return stage;
        }
        public int VisitCount(string residentId) { int i = Array.IndexOf(Balance.ResidentIds, residentId); return i < 0 ? 0 : Visits[i]; }
        int UpgradeIndex(string key) => Array.IndexOf(Balance.UpgradeKeys, key);
        public int UpgradeLevel(string key) { int i = UpgradeIndex(key); return i < 0 ? 0 : Upgrades[i]; }
        public bool CanBuy(string key)
        {
            int i = UpgradeIndex(key);
            return i >= 0 && Day >= Balance.UpgradeUnlockDay[i] && Upgrades[i] < Balance.UpgradeMax[i] && Money >= Balance.UpgradeCost(i, Upgrades[i]);
        }
        public bool Buy(string key)
        {
            if (!CanBuy(key)) return false;
            int i = UpgradeIndex(key);
            Money -= Balance.UpgradeCost(i, Upgrades[i]);
            Upgrades[i]++;
            if (key == "mold") ResetMolds();
            return true;
        }
        public bool SetActiveLocation(Location location)
        {
            if (Open && DayTime > 0) return false;
            if (location == Location.PangyoStation && !StationUnlocked) return false;
            if (location != Location.Skala && location != Location.PangyoStation) return false;
            ActiveLocation = location;
            return true;
        }
        public bool SetSavingsRate(double rate)
        {
            if (double.IsNaN(rate) || rate < 0 || rate > 1) return false;
            SavingsRate = rate;
            return true;
        }
        void ResetMolds()
        {
            int count = Balance.BaseMolds + UpgradeLevel("mold");
            while (Molds.Count < count) Molds.Add(new MoldState { cooldown = Molds.Count * Balance.FishAutoTime / count });
        }
        public void SetDayForTesting(int day)
        {
            if (day < 1 || DayTime != 0) return;
            Day = day; Stats.day = day;
        }
        public void Tick(double dt)
        {
            if (!Open || dt <= 0) return;
            if (DayTime == 0 && !shadowMode) dayStart = Snapshot().Copy();
            // Fixed internal steps keep the result stable for callers with different frame rates.
            while (dt > 0 && Open)
            {
                double step = Math.Min(0.1, dt);
                dt -= step;
                Clock += step; DayTime += step;
                UpdateMolds(step); UpdateTako(step); UpdateTteok(step);
                UpdateSpawn(step); UpdateCustomers(step);
                if (Glares > 0 && Clock >= glareDecayAt) { Glares--; glareDecayAt = Clock + Balance.GlareDecayTime; }
                if (GroupOrder != null && Clock >= GroupOrder.deadline) {
                    if (GroupOrder.accepted)
                    {
                        ReturnGroupBox();
                        EmployeeLoyalty = Math.Max(0, EmployeeLoyalty - 5);
                        Emit(SimEventKind.GroupFailed);
                    }
                    GroupOrder = null;
                }
                if (DayTime + 1e-8 >= Balance.DayLength) CloseDay();
            }
        }
        void UpdateMolds(double dt)
        {
            for (int i = 0; i < Molds.Count; i++)
            {
                MoldState m = Molds[i];
                if (m.phase == FishPhase.Empty)
                {
                    if (m.cooldown > 0) { m.cooldown -= dt; continue; }
                    if (FishTray.Count + Molds.Count < Balance.FishTrayBaseCapacity + Molds.Count * 2)
                    {
                        m.phase = FishPhase.Baking; m.automatic = true; m.time = 0;
                    }
                    continue;
                }
                if (m.phase != FishPhase.Baking) continue;
                m.time += dt;
                if (m.automatic && m.time >= Balance.FishAutoTime)
                {
                    int helper = UpgradeLevel("helper");
                    int min = helper == 0 ? Balance.FishAutoMin0 : helper == 1 ? Balance.FishAutoMin1 : Balance.FishAutoMin2;
                    int max = helper == 0 ? Balance.FishAutoMax0 : helper == 1 ? Balance.FishAutoMax1 : Balance.FishAutoMax2;
                    int points = min + (int)(random.Next() * (max - min + 1));
                    FinishFish(i, new QualityScore { batter = points / 4, filling = points / 4, cook = points - 2 * (points / 4) });
                }
                else if (!m.automatic && m.time >= Balance.FishAutoBurnTime) TakeOut(i);
            }
        }
        public bool HoldStart(int index)
        {
            if (!Open || index < 0 || index >= Molds.Count) return false;
            MoldState m = Molds[index];
            if (m.holding || (m.phase != FishPhase.Empty && !(m.phase == FishPhase.Baking && m.automatic) && m.phase != FishPhase.Bottom && m.phase != FishPhase.RedBean && m.phase != FishPhase.Top)) return false;
            if (m.phase == FishPhase.Empty || m.automatic) { m.phase = FishPhase.Bottom; m.automatic = false; m.bottomAmount = 0; m.fillingAmount = 0; m.topAmount = 0; }
            m.holding = true; m.holdStart = Clock;
            return true;
        }
        public bool HoldEnd(int index)
        {
            if (!Open || index < 0 || index >= Molds.Count) return false;
            MoldState m = Molds[index];
            if (!m.holding) return false;
            double amount = Math.Max(0, Clock - m.holdStart) * Balance.FishHoldRate;
            m.holding = false;
            if (m.phase == FishPhase.Bottom) { m.bottomAmount = amount; m.phase = FishPhase.RedBean; }
            else if (m.phase == FishPhase.RedBean) { m.fillingAmount = amount; m.phase = FishPhase.Top; }
            else if (m.phase == FishPhase.Top) { m.topAmount = amount; m.phase = FishPhase.Baking; m.time = 0; }
            return true;
        }
        static int Points(double value, double min, double max, int full, double penalty)
        {
            double gap = value < min ? min - value : value > max ? value - max : 0;
            return Math.Max(0, Math.Min(full, (int)Math.Round(full - gap * penalty)));
        }
        public bool TakeOut(int index)
        {
            if (!Open || index < 0 || index >= Molds.Count) return false;
            MoldState m = Molds[index];
            if (m.phase != FishPhase.Baking || m.automatic) return false;
            var score = new QualityScore {
                batter = Points(m.bottomAmount + m.topAmount, Balance.FishBatterMin, Balance.FishBatterMax, Balance.FishBatterPoints, Balance.FishMaxBatterPenaltyScale),
                filling = Points(m.fillingAmount, Balance.FishFillingMin, Balance.FishFillingMax, Balance.FishFillingPoints, Balance.FishMaxFillingPenaltyScale),
                cook = Points(m.time, Balance.FishCookMin, Balance.FishCookMax, Balance.FishCookPoints, Balance.FishCookPenaltyScale)
            };
            FinishFish(index, score);
            if (score.Basic >= Balance.HighScoreCombo) { Combo++; Emit(SimEventKind.Combo, index, Combo); } else Combo = 0;
            return true;
        }
        void FinishFish(int index, QualityScore score)
        {
            MoldState m = Molds[index];
            if (!m.automatic && GroupOrder != null && GroupOrder.accepted && GroupOrder.boxCount < GroupOrder.quantity)
                GroupOrder.box[GroupOrder.boxCount++] = score;
            else FishTray.Add(score);
            Emit(SimEventKind.BakeComplete, index, score.Total);
            m.phase = FishPhase.Empty; m.time = 0; m.holding = false; m.cooldown = Rand(Balance.FishRestartMin, Balance.FishRestartMax);
        }
        void UpdateTako(double dt)
        {
            if (UpgradeLevel("tako") == 0) return;
            int helper = UpgradeLevel("helper");
            if (Tako.phase == TakoPhase.Empty)
            {
                Tako.phase = TakoPhase.Pouring; Tako.automatic = true; Tako.time = 0;
            }
            if (Tako.automatic)
            {
                Tako.time += dt;
                double duration = helper >= 2 ? Balance.TakoAutoLevel2 : helper == 1 ? Balance.TakoAutoLevel1 : Balance.TakoAutoLevel0;
                if (Tako.time >= duration) CompleteTako(false);
            }
            else if (Tako.phase == TakoPhase.Roll1 || Tako.phase == TakoPhase.Roll2) Tako.time += dt;
            else if (Tako.phase == TakoPhase.Pouring) Tako.pourTime += dt;
        }
        public bool PourStart()
        {
            if (!Open || UpgradeLevel("tako") == 0 || Clock < takoReady || (Tako.phase != TakoPhase.Empty && !Tako.automatic)) return false;
            Tako.phase = TakoPhase.Pouring; Tako.automatic = false; Tako.pourTime = 0; Tako.rollsHit = 0;
            return true;
        }
        public bool PourEnd()
        {
            if (Tako.phase != TakoPhase.Pouring || Tako.automatic) return false;
            Tako.pourValid = Tako.pourTime >= Balance.PourMin && Tako.pourTime <= Balance.PourMax;
            Tako.phase = TakoPhase.Octopus;
            return true;
        }
        public bool AddOctopus()
        {
            if (Tako.phase != TakoPhase.Octopus) return false;
            Tako.phase = TakoPhase.Roll1; Tako.time = 0;
            return true;
        }
        public bool Roll()
        {
            if (Tako.phase != TakoPhase.Roll1 && Tako.phase != TakoPhase.Roll2) return false;
            if (Tako.time >= Balance.RollStart && Tako.time <= Balance.RollEnd) Tako.rollsHit++;
            else Combo = 0;
            Tako.phase = Tako.phase == TakoPhase.Roll1 ? TakoPhase.Roll2 : TakoPhase.Sauce;
            Tako.time = 0;
            return true;
        }
        public bool Sauce()
        {
            if (Tako.phase != TakoPhase.Sauce) return false;
            CompleteTako(Tako.rollsHit == 2 && Tako.pourValid);
            return true;
        }
        void CompleteTako(bool good)
        {
            if (!Tako.automatic)
            {
                int helper = UpgradeLevel("helper");
                double autoTime = helper >= 2 ? Balance.TakoAutoLevel2 : helper == 1 ? Balance.TakoAutoLevel1 : Balance.TakoAutoLevel0;
                takoReady = Clock + autoTime / Balance.MaxManualSpeedMultiplier;
            }
            Tako.phase = TakoPhase.Complete;
            int balls = takoBalls + Balance.TakoBaseHoles + Balance.TakoExtraHoles * UpgradeLevel("takoPan");
            int portions = balls / Balance.TakoBallsPerPlate;
            takoBalls = balls % Balance.TakoBallsPerPlate;
            TakoStock += portions;
            if (good) { TakoGoodStock += portions; Combo++; Emit(SimEventKind.Combo, 0, Combo); }
            Emit(SimEventKind.TakoComplete, 0, good ? 1 : 0);
            Tako.phase = TakoPhase.Empty; Tako.automatic = false; Tako.time = 0;
        }
        void UpdateTteok(double dt)
        {
            if (UpgradeLevel("tteok") == 0) return;
            if (tteokCooking)
            {
                tteokTime += dt;
                if (tteokTime >= Balance.TteokTime) { tteokCooking = false; tteokTime = 0; TteokStock += Balance.TteokBatch; }
            }
            else if (TteokStock == 0) { tteokCooking = true; tteokTime = 0; }
        }
        public bool StirTteok()
        {
            if (!tteokCooking || Clock < stirReady) return false;
            tteokTime += Balance.TteokStirReduction; stirReady = Clock + Balance.TteokStirCooldown;
            return true;
        }
        public bool RefillOden()
        {
            if (UpgradeLevel("oden") == 0 || Clock < odenReady) return false;
            odenBoostUntil = Clock + Balance.OdenBoostDuration;
            odenReady = Clock + Balance.OdenBoostCooldown;
            return true;
        }
        public bool Hawk()
        {
            if (!Open || Clock < hawkReady) return false;
            hawkUntil = Clock + Balance.HawkDuration;
            hawkReady = Clock + Balance.HawkCooldown;
            return true;
        }
        public bool CanInvite(bool campus = false) => Open && Clock >= inviteReady && (!campus || !CampusInviteBanned);
        public bool CanInviteMore()
        {
            if (Customers.Count >= Balance.MaxCustomersOnSite) return false;
            int queued = 0;
            foreach (CustomerState c in Customers)
                if (c.phase == CustomerPhase.Queue || c.phase == CustomerPhase.Serve) queued++;
            return queued < Balance.QueueMax;
        }
        public void RecordInviteFailure()
        {
            Glares++;
            if (Glares == 1) glareDecayAt = Clock + Balance.GlareDecayTime;
            if (Glares >= 3) { Glares = 0; GuardBanUntil = Clock + Balance.GuardBanTime; Reputation = Math.Max(0, Reputation - 5); Emit(SimEventKind.GuardWarning); }
        }
        public bool Invite(CustomerKind kind = CustomerKind.General, bool campus = false)
        {
            if (!CanInvite(campus) || !CanInviteMore()) return false;
            inviteReady = Clock + Balance.InviteCooldown;
            int resident = (int)(random.Next() * Visits.Length);
            var customer = new CustomerState { id = nextCustomerId++, residentIndex = resident, quantity = 1, kind = kind,
                menu = Menu.Fish, phase = CustomerPhase.Queue, timer = Balance.BrowseTime, patience = Balance.Patience };
            Customers.Add(customer);
            Emit(SimEventKind.CustomerArrived, customer.id);
            return true;
        }
        public bool Talk(string residentId)
        {
            int resident = Array.IndexOf(Balance.ResidentIds, residentId);
            if (!Open || resident < 0 || Clock < talkReady[resident] || talkCount[resident] >= Balance.TalkDailyLimit || !Customers.Exists(c => c.residentIndex == resident && c.phase != CustomerPhase.Leave)) return false;
            talkCount[resident]++;
            talkReady[resident] = Clock + Balance.TalkCooldown;
            AddVisit(resident);
            return true;
        }
        void UpdateSpawn(double dt)
        {
            spawnTimer -= dt;
            if (spawnTimer > 0) return;
            double rate = (1 + Balance.SignSpawnBonus * UpgradeLevel("sign") + Balance.PlanterSpawnBonus * UpgradeLevel("planter") + Balance.LightsSpawnBonus * UpgradeLevel("lights")) * Balance.WeatherSpawn[(int)Weather];
            rate *= 1 + (Reputation - 50) * .001;
            rate *= ActiveLocation == Location.Skala ? Balance.SkalaSpawnMultiplier : Balance.StationSpawnMultiplier;
            double fraction = DayTime / Balance.DayLength;
            bool peak = ActiveLocation == Location.Skala ? fraction >= Balance.SkalaPeakStart && fraction <= Balance.SkalaPeakEnd : fraction >= Balance.StationPeakStart && fraction <= Balance.StationPeakEnd;
            if (peak) rate *= Balance.PeakMultiplier;
            if (Clock < hawkUntil) rate *= Balance.HawkSpawnMultiplier;
            spawnTimer = Balance.SpawnInterval / rate * Rand(Balance.SpawnJitterMin, Balance.SpawnJitterMax);
            if (Customers.Count >= Balance.MaxCustomersOnSite) return;
            int resident = (int)(random.Next() * Visits.Length);
            double buy = (Balance.BuyChance + Balance.HeaterBuyBonus * UpgradeLevel("heater") + Balance.RadioBuyBonus * UpgradeLevel("radio") + (resident < Balance.NamedRegularCount ? FavorStage(resident) * Balance.RegularStageBuyBonus : 0)) * Balance.WeatherBuy[(int)Weather];
            buy *= 1 + (Reputation - 50) * .001;
            double roll = random.Next();
            if (roll > buy + Balance.BrowseChance) return;
            Menu menu = Menu.Fish;
            if (UpgradeLevel("tteok") > 0 && random.Next() < Balance.TteokPickChance) menu = Menu.Tteok;
            else if (UpgradeLevel("tako") > 0 && random.Next() < Balance.TakoPickChance) menu = Menu.Tako;
            else if (UpgradeLevel("oden") > 0 && random.Next() < Balance.OdenPickChance) menu = Menu.Oden;
            var customer = new CustomerState { id = nextCustomerId++, residentIndex = resident, quantity = 1, kind = RollCustomerKind(nextCustomerId - 1), menu = menu, phase = roll < buy ? CustomerPhase.Queue : CustomerPhase.Browse, timer = Balance.BrowseTime, patience = Balance.Patience };
            Customers.Add(customer);
            Emit(SimEventKind.CustomerArrived, customer.id);
        }
        public CustomerKind RollCustomerKind(int id)
        {
            double roll = ((uint)id * 2654435761u % 1000) / 1000.0;
            double employeeShare = Math.Min(.45, Balance.EmployeeShare + EmployeeLoyalty * .001);
            return roll < employeeShare ? CustomerKind.Employee : roll < employeeShare + Balance.TraineeShare ? CustomerKind.Trainee : CustomerKind.General;
        }
        public bool OfferGroupOrder(CustomerKind kind, double roll, int quantity)
        {
            if (kind != CustomerKind.Employee || GroupOrder != null || roll >= Balance.GroupChance + EmployeeLoyalty * .0004) return false;
            int min = Molds.Count <= 2 ? 6 : Molds.Count <= 4 ? 8 : 10;
            int max = Molds.Count <= 2 ? 9 : Molds.Count <= 4 ? 12 : 16;
            GroupOrder = new GroupOrderState { quantity = min + Math.Abs(quantity - Balance.GroupMin) % (max - min + 1), deadline = Clock + Balance.GroupOfferTime };
            Emit(SimEventKind.GroupOffered, 0, GroupOrder.quantity);
            return true;
        }
        public bool AcceptGroupOrder()
        {
            if (GroupOrder == null || GroupOrder.accepted || Clock >= GroupOrder.deadline) return false;
            GroupOrder.accepted = true;
            GroupOrder.box = new QualityScore[GroupOrder.quantity];
            GroupOrder.deadline = Clock + Balance.GroupBaseDuration + GroupOrder.quantity * Balance.GroupSecondsPerFish;
            return true;
        }
        // 카운터 E로 전달할 수 있는지: 상자와 진열대 재고를 합쳐 수량 이상이다.
        public bool CanDeliverGroupOrder => GroupOrder != null && GroupOrder.accepted && Clock < GroupOrder.deadline && GroupOrder.boxCount + FishTray.Count >= GroupOrder.quantity;
        public bool MoveTrayToGroupBox()
        {
            if (GroupOrder == null || !GroupOrder.accepted || GroupOrder.boxCount >= GroupOrder.quantity || FishTray.Count == 0) return false;
            int move = Math.Min(FishTray.Count, GroupOrder.quantity - GroupOrder.boxCount);
            for (int i = 0; i < move; i++) GroupOrder.box[GroupOrder.boxCount++] = FishTray[i];
            FishTray.RemoveRange(0, move);
            return true;
        }
        void ReturnGroupBox()
        {
            for (int i = 0; i < GroupOrder.boxCount; i++) FishTray.Add(GroupOrder.box[i]);
        }
        public bool DeclineGroupOrder()
        {
            if (GroupOrder == null || GroupOrder.accepted) return false;
            GroupOrder = null; return true;
        }
        public bool DeliverGroupOrder()
        {
            if (GroupOrder == null || !GroupOrder.accepted || Clock >= GroupOrder.deadline || GroupOrder.boxCount < GroupOrder.quantity) return false;
            int qty = GroupOrder.quantity, price = 0;
            for (int i = 0; i < qty; i++) price += GroupOrder.box[i].Price(Balance.FishPrice);
            price = (int)Math.Round(price * (1 + Balance.GroupBonus), MidpointRounding.AwayFromZero);
            int cost = qty * Balance.FishCost;
            Money += price - cost; Stats.revenue += price; Stats.cost += cost; Stats.sold += qty; Stats.customers++;
            EmployeeLoyalty = Math.Min(100, EmployeeLoyalty + 10);
            Reputation = Math.Min(100, Reputation + 2);
            GroupOrder = null; Emit(SimEventKind.GroupSucceeded, 0, price);
            return true;
        }
        void UpdateCustomers(double dt)
        {
            for (int i = Customers.Count - 1; i >= 0; i--)
            {
                CustomerState c = Customers[i];
                if (c.phase == CustomerPhase.Browse)
                {
                    c.timer -= dt;
                    if (c.timer <= 0) { if (random.Next() < Balance.BrowseConvertChance) c.phase = CustomerPhase.Queue; else Customers.RemoveAt(i); }
                }
                else if (c.phase == CustomerPhase.Leave) Customers.RemoveAt(i);
            }
            int queued = 0;
            foreach (CustomerState c in Customers)
            {
                if (c.phase != CustomerPhase.Queue && c.phase != CustomerPhase.Serve) continue;
                queued++;
                if (queued > Balance.QueueMax) { c.phase = CustomerPhase.Leave; continue; }
                if (queued == 1) { c.phase = CustomerPhase.Serve; if (c.timer <= 0 || c.timer > Balance.ServeTime) c.timer = Balance.ServeTime; }
                if (c.phase == CustomerPhase.Serve)
                {
                    double speed = c.menu == Menu.Oden && Clock < odenBoostUntil ? Balance.OdenBoostMultiplier : 1;
                    c.timer -= dt * speed;
                    if (c.timer <= 0)
                    {
                        if (Serve(c)) c.phase = CustomerPhase.Leave;
                        else { c.patience -= dt; c.timer = 0; if (c.patience <= 0) { Stats.missed++; Stats.shortfall++; c.phase = CustomerPhase.Leave; } }
                    }
                }
            }
        }
        public bool ServeNow(int customerId)
        {
            if (!Open || FrontCustomerId != customerId) return false;
            CustomerState c = Customers.Find(x => x.id == customerId);
            c.timer = 0;
            if (Serve(c, true)) { c.phase = CustomerPhase.Leave; return true; }
            return false;
        }
        bool Serve(CustomerState c, bool immediate = false)
        {
            if (c.menu == Menu.Tako && TakoStock == 0) c.menu = UpgradeLevel("oden") > 0 ? Menu.Oden : Menu.Fish;
            if (c.menu == Menu.Tteok && TteokStock == 0) c.menu = UpgradeLevel("oden") > 0 ? Menu.Oden : Menu.Fish;
            int price = 0, cost = 0;
            switch (c.menu)
            {
                case Menu.Fish:
                    if (FishTray.Count == 0) return false;
                    price = FishTray[0].Price(Balance.FishPrice);
                    cost = Balance.FishCost; FishTray.RemoveAt(0); break;
                case Menu.Oden:
                    if (UpgradeLevel("oden") == 0) return false;
                    price = Balance.OdenPrice; cost = Balance.OdenCost; break;
                case Menu.Tteok:
                    if (TteokStock == 0) return false;
                    TteokStock--; price = Balance.TteokPrice; cost = Balance.TteokCost; break;
                case Menu.Tako:
                    if (TakoStock == 0) return false;
                    TakoStock--;
                    bool good = TakoGoodStock > 0;
                    if (good) TakoGoodStock--;
                    price = (int)(Balance.TakoPrice * (good ? Balance.GoodMultiplier : 1));
                    cost = Balance.TakoCost; break;
            }
            int tip = immediate ? Balance.ServeTip + (c.kind == CustomerKind.Employee ? Math.Min(100, EmployeeLoyalty * 2) : 0) : 0;
            c.servedNow = immediate;
            Money += price - cost + tip;
            Stats.revenue += price + tip; Stats.cost += cost; Stats.sold++; Stats.customers++;
            Emit(SimEventKind.Sale, c.id, price + tip);
            AddVisit(c.residentIndex);
            if (Stats.sold % 10 == 0) Reputation = Math.Min(100, Reputation + 1);
            if (c.kind == CustomerKind.Employee)
            {
                double offerRoll = ((uint)c.id * 2246822519u % 10000) / 10000.0;
                OfferGroupOrder(c.kind, offerRoll, Balance.GroupMin + c.id % (Balance.GroupMax - Balance.GroupMin + 1));
            }
            return true;
        }
        void AddVisit(int resident)
        {
            int before = FavorStage(resident);
            Visits[resident]++;
            int after = FavorStage(resident);
            if (after > before) Emit(SimEventKind.FavorStage, resident, after);
        }
        void CloseDay()
        {
            Open = false;
            Stats.profit = Stats.revenue - Stats.cost;
            Stats.weather = Weather; Stats.tomorrow = Tomorrow;
            if (!shadowMode && dayStart != null && dayStart.stationUnlocked)
            {
                var inactive = RunShadow(dayStart, ActiveLocation == Location.Skala ? Location.PangyoStation : Location.Skala);
                Stats.revenue += inactive.Report.revenue; Stats.cost += inactive.Report.cost;
                Stats.sold += inactive.Report.sold; Stats.customers += inactive.Report.customers;
                Stats.profit += inactive.Report.profit; Money += inactive.Report.profit;
            }
            Report = Stats.Copy();
            if (!shadowMode && dayStart != null)
            {
                var idle = RunShadow(dayStart, ActiveLocation);
                int idleProfit = idle.Report.profit;
                if (dayStart.stationUnlocked) idleProfit += RunShadow(dayStart, ActiveLocation == Location.Skala ? Location.PangyoStation : Location.Skala).Report.profit;
                OfflineHourlyProfit = Math.Max(0, idleProfit) / Balance.OfflineDayHours;
                CumulativeProfit += Report.profit;
                int saved = (int)Math.Round(Math.Max(0, Report.profit) * SavingsRate, MidpointRounding.AwayFromZero);
                saved = Math.Min(saved, Money);
                Money -= saved; HomeFund += saved;
                if (!HomeReached && HomeFund >= Balance.HomeGoal) { HomeReached = true; Emit(SimEventKind.HomeReached, 0, Day); }
                if (!StationUnlocked && CumulativeProfit >= Balance.StationProfitUnlock)
                {
                    int regulars = 0;
                    for (int i = 0; i < Balance.NamedRegularCount; i++) if (FavorStage(i) >= Balance.StationRegularStage) regulars++;
                    if (regulars >= Balance.StationRegularsUnlock) { StationUnlocked = true; Emit(SimEventKind.LocationUnlocked, 1, Day); }
                }
            }
        }
        static Simulation RunShadow(DayStartData start, Location location)
        {
            var copy = new Simulation(new SeedRandom(start.randomState));
            copy.shadowMode = true; copy.RestoreState(start); copy.ActiveLocation = location;
            copy.Tick(Balance.DayLength);
            return copy;
        }
        public bool NextDay()
        {
            if (Open) return false;
            Day++; DayTime = 0; Open = true; Weather = Tomorrow; Tomorrow = RollWeather();
            Stats = new DayReport { day = Day }; Report = null;
            Customers.Clear(); FishTray.Clear(); TteokStock = 0;
            tteokCooking = false; tteokTime = 0; spawnTimer = 0;
            hawkUntil = 0; hawkReady = 0; inviteReady = 0; odenBoostUntil = 0; odenReady = 0;
            stirReady = 0; takoReady = 0; Combo = 0; Glares = 0; GuardBanUntil = 0; GroupOrder = null;
            Array.Clear(talkReady, 0, talkReady.Length);
            Array.Clear(talkCount, 0, talkCount.Length);
            Molds.Clear(); ResetMolds(); Tako = new TakoState(); dayStart = null;
            return true;
        }
        public int OfflineEarnings(TimeSpan away)
        {
            double hours = Math.Min(Balance.OfflineCapHours, Math.Max(0, away.TotalHours));
            int earned = (int)Math.Round(Math.Max(0, OfflineHourlyProfit) * Balance.OfflineShare * hours);
            Money += earned;
            CumulativeProfit += earned;
            int saved = (int)Math.Round(earned * SavingsRate, MidpointRounding.AwayFromZero);
            Money -= saved; HomeFund += saved;
            if (!HomeReached && HomeFund >= Balance.HomeGoal) { HomeReached = true; Emit(SimEventKind.HomeReached, 0, Day); }
            return earned;
        }
        public SaveData Snapshot()
        {
            return new SaveData {
                randomState = random.State, day = Day, money = Money, dayTime = DayTime, clock = Clock, open = Open,
                weather = Weather, tomorrow = Tomorrow, nextCustomerId = nextCustomerId, combo = Combo,
                odenStock = OdenStock, tteokStock = TteokStock, takoStock = TakoStock, takoGoodStock = TakoGoodStock, takoBalls = takoBalls,
                upgrades = (int[])Upgrades.Clone(), visits = (int[])Visits.Clone(), fishTray = FishTray.ConvertAll(x => x.Copy()).ToArray(),
                spawnTimer = spawnTimer, tteokTime = tteokTime, tteokCooking = tteokCooking,
                offlineHourlyProfit = OfflineHourlyProfit, hawkUntil = hawkUntil, hawkReady = hawkReady, inviteReady = inviteReady, takoReady = takoReady,
                odenBoostUntil = odenBoostUntil, odenReady = odenReady, stirReady = stirReady,
                talkReady = (double[])talkReady.Clone(), talkCount = (int[])talkCount.Clone(),
                molds = Molds.ConvertAll(m => m.Copy()).ToArray(), tako = Tako.Copy(),
                customers = Customers.ConvertAll(c => c.Copy()).ToArray(), stats = Stats.Copy(), report = Report?.Copy(), dayStart = dayStart?.Copy(),
                activeLocation = (int)ActiveLocation, stationUnlocked = StationUnlocked, cumulativeProfit = CumulativeProfit,
                homeFund = HomeFund, homeReached = HomeReached, savingsRate = SavingsRate,
                reputation = Reputation, employeeLoyalty = EmployeeLoyalty, glares = Glares, guardBanUntil = GuardBanUntil, glareDecayAt = glareDecayAt, groupOrder = GroupOrder?.Copy()
            };
        }
        public void Restore(SaveData s)
        {
            if (s == null) return;
            RestoreState(s);
            OfflineHourlyProfit = s.offlineHourlyProfit; Report = s.report?.Copy(); dayStart = s.dayStart?.Copy();
            CumulativeProfit = s.cumulativeProfit; HomeFund = s.homeFund; HomeReached = s.homeReached; SavingsRate = s.savingsRate;
        }
        void RestoreState(DayStartData s)
        {
            random.State = s.randomState; Day = s.day; Money = s.money; DayTime = s.dayTime; Clock = s.clock; Open = s.open;
            Weather = s.weather; Tomorrow = s.tomorrow; nextCustomerId = s.nextCustomerId; Combo = s.combo;
            OdenStock = s.odenStock; TteokStock = s.tteokStock; TakoStock = s.takoStock; TakoGoodStock = s.takoGoodStock; takoBalls = s.takoBalls;
            Array.Copy(s.upgrades, Upgrades, Math.Min(s.upgrades.Length, Upgrades.Length));
            Array.Copy(s.visits, Visits, Math.Min(s.visits.Length, Visits.Length));
            FishTray.Clear(); foreach (QualityScore q in s.fishTray) FishTray.Add(q.Copy()); Molds.Clear();
            foreach (MoldState m in s.molds) Molds.Add(m.Copy());
            Tako = s.tako.Copy(); Customers.Clear(); foreach (CustomerState c in s.customers) Customers.Add(c.Copy());
            spawnTimer = s.spawnTimer; tteokTime = s.tteokTime; tteokCooking = s.tteokCooking;
            hawkUntil = s.hawkUntil; hawkReady = s.hawkReady; inviteReady = s.inviteReady;
            takoReady = s.takoReady;
            odenBoostUntil = s.odenBoostUntil; odenReady = s.odenReady; stirReady = s.stirReady;
            talkReady = (double[])s.talkReady.Clone(); talkCount = (int[])s.talkCount.Clone();
            Stats = s.stats.Copy();
            ActiveLocation = (Location)s.activeLocation; StationUnlocked = s.stationUnlocked;
            Reputation = s.reputation == 0 && s.day <= 1 ? 50 : s.reputation; EmployeeLoyalty = s.employeeLoyalty; Glares = s.glares;
            GuardBanUntil = s.guardBanUntil; glareDecayAt = s.glareDecayAt; GroupOrder = s.groupOrder?.Copy();
        }
    }
}
