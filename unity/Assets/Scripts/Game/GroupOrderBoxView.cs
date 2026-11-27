using UnityEngine;

namespace Unjungcheon.Game
{
    public sealed class GroupOrderBoxView : MonoBehaviour
    {
        public GameRunner Runner;
        public GameObject Visual;
        public GameObject[] Fish;
        int lastCount = -1;

        void Update()
        {
            if (Runner == null || Runner.Simulation == null) return;
            var order = Runner.Simulation.GroupOrder;
            bool active = order != null && order.accepted;
            if (Visual.activeSelf != active) Visual.SetActive(active);
            if (!active) { lastCount = -1; return; }
            if (lastCount == order.boxCount) return;
            lastCount = order.boxCount;
            for (int i = 0; i < Fish.Length; i++) Fish[i].SetActive(i < lastCount);
        }
    }
}
