using UnityEngine;

namespace Unjungcheon.Game
{
    public sealed class Pedestrians : MonoBehaviour
    {
        public static Pedestrians Active { get; private set; }
        public Pedestrian[] People;
        public float NextAttemptTime { get; private set; }
        public bool CanAttempt => Time.time >= NextAttemptTime;
        public void RecordAttempt() { NextAttemptTime = Time.time + (float)Core.Balance.InviteCooldown; }
        void Awake() { Active = this; }
        int day;
        public GameRunner Runner;
        void Start() { day = Runner == null ? 1 : Runner.Simulation.Day; }
        void Update()
        {
            if (Runner == null || Runner.Simulation.Day == day) return;
            day = Runner.Simulation.Day;
            for (int i = 0; i < People.Length; i++) People[i].ResetToStart();
        }
        void OnDestroy() { if (Active == this) Active = null; }
    }
}
