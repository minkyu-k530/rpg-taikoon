using UnityEngine;
using Unjungcheon.Core;

namespace Unjungcheon.Game
{
    // Core Simulation을 소유하고 매 프레임 시간을 흘린다.
    public sealed class GameRunner : MonoBehaviour
    {
        public uint Seed = 42;
        public Simulation Simulation { get; private set; }

        void Awake() { Simulation = new Simulation(new SeedRandom(Seed)); }

        void Update() { Simulation.Tick(Time.deltaTime); }

        // 카운터: 맨 앞 손님을 바로 받는다.
        public bool ServeNow()
        {
            int id = Simulation.FrontCustomerId;
            return id >= 0 && Simulation.ServeNow(id);
        }

        // 호객 지점
        public bool Hawk() { return Simulation.Hawk(); }
    }
}
