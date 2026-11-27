using UnityEngine;
using UnityEngine.UI;

namespace Unjungcheon.Game
{
    public static class TutorialSteps
    {
        public static readonly string[] Text = {
            "WASD·방향키로 걸어 보세요 (Shift 달리기, Space 점프)",
            "붕어빵 틀 앞에서 E를 꾹 눌러 반죽을 부어 보세요",
            "포장마차 카운터로 가서 E — 손님 받기",
            "V — 1인칭 사장 시점으로 보기",
            "길 건너 행인에게 다가가 E — 호객",
            "이제 자유롭게 장사하세요. F1로 안내를 다시 볼 수 있어요"
        };
    }

    public sealed class Tutorial : MonoBehaviour
    {
        public static Tutorial Active { get; private set; }
        public Text Card;
        public PlayerController Player;
        public CameraRig Camera;
        public InteractionFinder Finder;
        public IGameInput InputSource { get; set; }
        public int Step { get; private set; }
        public bool Done { get; private set; }
        Vector3 stepStart;
        bool sawFirstPerson;
        float finalUntil;

        void Awake()
        {
            Active = this;
            if (InputSource == null) InputSource = GameInputFactory.Create();
            Step = Mathf.Clamp(PlayerPrefs.GetInt("tutorial.step", 0), 0, 5);
            Done = PlayerPrefs.GetInt("tutorial.done", 0) != 0;
        }
        void Start() { stepStart = Player.transform.position; Refresh(); }
        void OnDestroy() { if (Active == this) Active = null; }
        void Update()
        {
            if (InputSource.RestartDown) Restart();
            if (Done) return;
            if (InputSource.SkipDown) { Skip(); return; }
            if (Step == 0 && Vector3.Distance(stepStart, Player.transform.position) >= 3f) Advance();
            if (Step == 2 && Finder != null && Finder.Nearest != null && Finder.Nearest.Kind == InteractionKind.Counter && Finder.Runner.Simulation.FrontCustomerId < 0) Advance();
            if (Step == 3)
            {
                if (Camera.FirstPerson) sawFirstPerson = true;
                else if (sawFirstPerson) Advance();
            }
            if (Step == 5 && Time.time >= finalUntil) Finish();
        }
        public void OnFishTaken() { if (Step == 1) Advance(); }
        public void OnServe() { if (Step == 2) Advance(); }
        public void OnInviteAttempt() { if (Step == 4) Advance(); }
        public void Advance()
        {
            if (Done || Step >= 5) return;
            Step++;
            PlayerPrefs.SetInt("tutorial.step", Step);
            PlayerPrefs.Save();
            if (Step == 5) finalUntil = Time.time + 5f;
            Refresh();
        }
        public void Skip() { Finish(); }
        void Finish()
        {
            Done = true;
            PlayerPrefs.SetInt("tutorial.done", 1);
            PlayerPrefs.Save();
            Refresh();
        }
        public void Restart()
        {
            Done = false; Step = 0; sawFirstPerson = false; stepStart = Player.transform.position;
            PlayerPrefs.SetInt("tutorial.step", 0); PlayerPrefs.SetInt("tutorial.done", 0); PlayerPrefs.Save();
            Refresh();
        }
        void Refresh()
        {
            if (Card == null) return;
            Card.transform.parent.gameObject.SetActive(!Done);
            if (!Done) Card.text = TutorialSteps.Text[Step] + "    건너뛰기 Esc";
        }
    }
}
