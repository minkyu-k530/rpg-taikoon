using UnityEngine;
using Unjungcheon.Core;

namespace Unjungcheon.Game
{
    public sealed class FishMoldView : MonoBehaviour
    {
        public int Index;
        public GameRunner Runner;
        public Transform Batter, Filling, Lid, Steam;
        public Renderer BatterRenderer, StatusDot;
        public GameObject[] TrayFish;
        int lastCount = -1;
        MaterialPropertyBlock block;
        void Awake() { block = new MaterialPropertyBlock(); }
        void Update()
        {
            if (Runner == null || Runner.Simulation == null || Index >= Runner.Simulation.Molds.Count) return;
            Simulation sim = Runner.Simulation;
            MoldState m = sim.Molds[Index];
            float batter = m.phase == FishPhase.Empty ? 0 : m.phase == FishPhase.Bottom ? (float)System.Math.Min(1, m.holding ? (sim.Clock - m.holdStart) * Balance.FishHoldRate : m.bottomAmount) : 1f;
            Batter.localScale = new Vector3(.30f, Mathf.Max(.002f, batter * .06f), .22f);
            float filling = m.phase == FishPhase.RedBean ? (float)(m.holding ? System.Math.Min(1, (sim.Clock - m.holdStart) * Balance.FishHoldRate) : m.fillingAmount) :
                m.phase == FishPhase.Top || m.phase == FishPhase.Baking ? 1f : 0f;
            Filling.gameObject.SetActive(filling > 0f);
            Filling.localScale = new Vector3(.18f * Mathf.Max(.05f, filling), .02f, .15f * Mathf.Max(.05f, filling));
            Lid.localRotation = Quaternion.RotateTowards(Lid.localRotation, Quaternion.Euler(m.phase == FishPhase.Baking ? 0f : -65f, 0f, 0f), 260f * Time.deltaTime);
            Steam.gameObject.SetActive(m.phase == FishPhase.Baking);
            if (m.phase == FishPhase.Baking)
            {
                float t = Mathf.Clamp01((float)m.time / 30f);
                block.SetColor("_BaseColor", Color.Lerp(new Color(1f, .78f, .2f), new Color(.25f, .12f, .045f), t));
                BatterRenderer.SetPropertyBlock(block);
            }
            else BatterRenderer.SetPropertyBlock(null);
            Color dot = m.phase == FishPhase.Empty || m.phase == FishPhase.Bottom ? Color.gray :
                m.phase == FishPhase.Baking && m.time > Balance.FishCookMax ? Color.red :
                m.phase == FishPhase.Baking && m.time >= Balance.FishCookMin ?
                    (Mathf.Sin(Time.time * 8f) > 0f ? Color.green : Color.white) : Color.yellow;
            block.SetColor("_BaseColor", dot);
            StatusDot.SetPropertyBlock(block);
            if (TrayFish != null && lastCount != sim.FishTray.Count)
            {
                lastCount = sim.FishTray.Count;
                for (int i = 0; i < TrayFish.Length; i++) TrayFish[i].SetActive(i < lastCount);
            }
        }
    }
}
