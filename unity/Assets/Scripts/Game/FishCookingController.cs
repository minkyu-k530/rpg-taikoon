using UnityEngine;
using Unjungcheon.Core;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Unjungcheon.Game
{
    public sealed class FishCookingController : MonoBehaviour
    {
        public GameRunner Runner;
        public InteractionFinder Finder;
        public CameraRig Camera;
        int heldIndex = -1;
        bool lastHeld;
        public int SelectedIndex { get; private set; } = -1;

        public bool StartHold(int index)
        {
            if (Runner == null || !Runner.Simulation.HoldStart(index)) return false;
            heldIndex = index; SelectedIndex = index; return true;
        }
        public bool EndHold()
        {
            if (heldIndex < 0) return false;
            int index = heldIndex; heldIndex = -1;
            return Runner.Simulation.HoldEnd(index);
        }
        public bool TakeOut(int index)
        {
            Simulation sim = Runner.Simulation;
            int beforeBox = sim.GroupOrder == null ? 0 : sim.GroupOrder.boxCount;
            if (!sim.TakeOut(index)) return false;
            QualityScore q = sim.GroupOrder != null && sim.GroupOrder.accepted && sim.GroupOrder.boxCount > beforeBox ?
                sim.GroupOrder.box[sim.GroupOrder.boxCount - 1] : sim.FishTray[sim.FishTray.Count - 1];
            Toast.Show($"반죽 {q.batter} · 팥 {q.filling} · 익힘 {q.cook} = {q.Total}점 → {q.Price(Balance.FishPrice):N0}원");
            Tutorial.Active?.OnFishTaken();
            return true;
        }
        void Update()
        {
            if (Runner == null || Runner.Simulation == null) return;
            SelectedIndex = -1;
            if (Camera != null && Camera.FirstPerson && Physics.Raycast(Camera.transform.position, Camera.transform.forward, out RaycastHit hit, 3f))
            {
                FishMoldView view = hit.collider.GetComponent<FishMoldView>();
                if (view != null) SelectedIndex = view.Index;
            }
            else if (Finder != null && Finder.Nearest != null && Finder.Nearest.Kind == InteractionKind.Mold) SelectedIndex = Finder.Nearest.MoldIndex;
#if ENABLE_INPUT_SYSTEM
            bool key = Keyboard.current != null && Keyboard.current.eKey.isPressed;
            bool mouse = Camera != null && Camera.FirstPerson && Mouse.current != null && Mouse.current.leftButton.isPressed;
#else
            bool key = Input.GetKey(KeyCode.E);
            bool mouse = Camera != null && Camera.FirstPerson && Input.GetMouseButton(0);
#endif
            bool held = key || mouse;
            if (heldIndex >= 0 && !held) EndHold();
            else if (held && !lastHeld && SelectedIndex >= 0)
            {
                MoldState m = Runner.Simulation.Molds[SelectedIndex];
                if (m.phase == FishPhase.Baking && !m.automatic) TakeOut(SelectedIndex);
                else StartHold(SelectedIndex);
            }
            lastHeld = held;
        }
    }
}
