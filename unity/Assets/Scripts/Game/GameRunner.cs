using UnityEngine;
using Unjungcheon.Core;

namespace Unjungcheon.Game
{
    // Core Simulation을 소유하고 매 프레임 시간을 흘린다.
    public sealed class GameRunner : MonoBehaviour
    {
        public uint Seed = 42;
        public Simulation Simulation { get; private set; }

        void Awake()
        {
            Simulation = new Simulation(new SeedRandom(Seed));
            Simulation.OnEvent += OnSimulationEvent;
        }

        void OnSimulationEvent(SimEvent e)
        {
            switch (e.kind)
            {
                case SimEventKind.GroupFailed: Toast.Show("단체 주문 시간 초과 — 임직원 친밀도 −5"); break;
                case SimEventKind.GroupSucceeded: Toast.Show("단체 주문 완료 · 친밀도 UP! +10"); break;
                case SimEventKind.GuardWarning: Toast.Show("경비: 건물 앞 호객은 자제해 주세요 · 60초"); break;
            }
        }

        void Update() { Simulation.Tick(Time.deltaTime); }

        // 카운터: 맨 앞 손님을 바로 받는다.
        public bool ServeNow()
        {
            int id = Simulation.FrontCustomerId;
            return id >= 0 && Simulation.ServeNow(id);
        }

        // 호객 지점
        public bool Hawk() { return Simulation.Hawk(); }
        public bool Invite(CustomerKind kind = CustomerKind.General, bool campus = false) { return Simulation.Invite(kind, campus); }
    }
}
