using UnityEngine;
using UnityEngine.UI;
using Unjungcheon.Core;

namespace Unjungcheon.Game
{
    // 최소 HUD: 날짜, 남은 시간, 돈, 현재 상호작용 안내. 글자는 값이 바뀔 때만 만든다.
    public sealed class GameHud : MonoBehaviour
    {
        public GameRunner Runner;
        public InteractionFinder Finder;
        public Text Status;
        public Text Prompt;
        public Text Group;
        public Text Risk;
        public FishCookingController Cooking;
        public Text MoldStep;
        public RectTransform MoldFill, MoldTarget;
        public GameObject MoldPanel;
        int lastGroupSeconds = -1, lastQty = -1, lastBox = -1, lastLoyalty = -1, lastGlares = -1, lastRep = -1, lastBan = -1;
        int day = -1, money = int.MinValue, seconds = -1, promptKey = int.MinValue;

        void Update()
        {
            if (Runner == null || Runner.Simulation == null) return;
            Simulation sim = Runner.Simulation;
            int left = Mathf.Max(0, (int)(Balance.DayLength - sim.DayTime));
            if (day != sim.Day || money != sim.Money || seconds != left)
            {
                day = sim.Day; money = sim.Money; seconds = left;
                Status.text = $"{day}일째   남은 시간 {seconds / 60}:{seconds % 60:00}   {money:N0}원";
            }
            if (Group != null)
            {
                GroupOrderState order = sim.GroupOrder;
                int groupSeconds = order == null ? -1 : Mathf.Max(0, Mathf.CeilToInt((float)(order.deadline - sim.Clock)));
                int box = order == null ? -1 : order.boxCount;
                if (groupSeconds != lastGroupSeconds || lastQty != sim.FishTray.Count || lastBox != box || lastLoyalty != sim.EmployeeLoyalty)
                {
                    lastGroupSeconds = groupSeconds; lastQty = sim.FishTray.Count; lastBox = box; lastLoyalty = sim.EmployeeLoyalty;
                    string loyaltyBar = new string('■', sim.EmployeeLoyalty / 20) + new string('□', 5 - sim.EmployeeLoyalty / 20);
                    Group.text = order == null ? sim.EmployeeLoyalty > 0 ? $"임직원 친밀도 {loyaltyBar} {sim.EmployeeLoyalty}/100" : "" : order.accepted ?
                        $"상자 {order.boxCount}/{order.quantity} · {groupSeconds}초 · 직접 구운 붕어빵만 담깁니다 · F 재고 이동" :
                        $"팀 간식 {order.quantity}개 가능할까요?  F 수락 / Q 거절  {groupSeconds}초";
                }
                Group.transform.parent.gameObject.SetActive(order != null || sim.EmployeeLoyalty > 0);
            }
            if (Risk != null)
            {
                int ban = Mathf.Max(0, Mathf.CeilToInt((float)(sim.GuardBanUntil - sim.Clock)));
                if (lastGlares != sim.Glares || lastRep != sim.Reputation || lastBan != ban)
                {
                    lastGlares = sim.Glares; lastRep = sim.Reputation; lastBan = ban;
                    Risk.text = $"평판 {sim.Reputation}/100   눈총 {sim.Glares}/3" + (ban > 0 ? $"   캠퍼스 호객 금지 {ban}초" : "");
                }
                Risk.transform.parent.gameObject.SetActive(sim.Glares > 0 || ban > 0 || sim.Reputation != 50);
            }
            InteractionPoint point = Finder == null ? null : Finder.Nearest;
            int inviteWait = Mathf.Max(0, Mathf.CeilToInt((float)(sim.InviteReady - sim.Clock)));
            if (Pedestrians.Active != null) inviteWait = Mathf.Max(inviteWait, Mathf.CeilToInt(Pedestrians.Active.NextAttemptTime - Time.time));
            bool banned = Finder != null && Finder.NearestPedestrian != null && Finder.NearestPedestrian.transform.position.z >= InviteZone.CampusStartZ && sim.CampusInviteBanned;
            bool full = Finder != null && Finder.NearestPedestrian != null && !sim.CanInviteMore();
            int key = Finder != null && Finder.NearestPedestrian != null ? banned ? 900 : full ? 901 : inviteWait > 0 ? 400 + inviteWait : 40 : PromptKey(point, sim);
            if (key != promptKey)
            {
                promptKey = key;
                Prompt.text = key == 40 ? "E  행인에게 호객" : key == 900 ? "경비 경고 · 캠퍼스 호객 금지" : key == 901 ? "줄이 꽉 찼어요" : key >= 400 && key < 900 ? $"호객 {key - 400}초 뒤" : PromptText(point, sim);
            }
            UpdateMold(sim);
        }

        int lastMold = -1, lastPhase = -1;
        void UpdateMold(Simulation sim)
        {
            int index = Cooking == null ? -1 : Cooking.SelectedIndex;
            bool show = index >= 0 && index < sim.Molds.Count;
            if (MoldPanel.activeSelf != show) MoldPanel.SetActive(show);
            if (!show) { lastMold = -1; return; }
            MoldState mold = sim.Molds[index];
            if (lastMold != index || lastPhase != (int)mold.phase)
            {
                lastMold = index; lastPhase = (int)mold.phase;
                MoldStep.text = mold.phase == FishPhase.Empty || mold.phase == FishPhase.Bottom ? "반죽 붓기 · E 꾹" :
                    mold.phase == FishPhase.RedBean ? "팥 넣기 · E 꾹" : mold.phase == FishPhase.Top ? "위 반죽 · E 꾹" :
                    mold.automatic ? "자동 굽는 중" : "굽기 · 익으면 E 꺼내기";
            }
            float amount = mold.phase == FishPhase.Baking ? Mathf.Clamp01((float)mold.time / 30f) :
                mold.holding ? Mathf.Clamp01((float)((sim.Clock - mold.holdStart) * Balance.FishHoldRate)) : 0f;
            float lo = mold.phase == FishPhase.RedBean ? .7f : mold.phase == FishPhase.Baking ? .6f :
                mold.phase == FishPhase.Top ? Mathf.Clamp01(.9f - (float)mold.bottomAmount) : .45f;
            float hi = mold.phase == FishPhase.RedBean ? .9f : mold.phase == FishPhase.Baking ? .733f :
                mold.phase == FishPhase.Top ? Mathf.Clamp01(1f - (float)mold.bottomAmount) : .5f;
            MoldFill.anchorMax = new Vector2(amount, 1f);
            MoldTarget.anchorMin = new Vector2(lo, 0f);
            MoldTarget.anchorMax = new Vector2(hi, 1f);
        }

        static int HawkWait(Simulation sim) => Mathf.CeilToInt((float)(sim.HawkReady - sim.Clock));

        static int PromptKey(InteractionPoint point, Simulation sim)
        {
            if (point == null) return -1;
            switch (point.Kind)
            {
                case InteractionKind.Counter: return sim.CanDeliverGroupOrder ? 12 : sim.FrontCustomerId >= 0 ? 10 : 11;
                case InteractionKind.Hawk: return 1000 + Mathf.Max(0, HawkWait(sim));
                case InteractionKind.Guard: return 30;
                case InteractionKind.Directory: return 31;
                default: return 20;
            }
        }

        static string PromptText(InteractionPoint point, Simulation sim)
        {
            if (point == null) return "";
            switch (point.Kind)
            {
                case InteractionKind.Counter: return sim.CanDeliverGroupOrder ? "E  단체 주문 전달" : sim.FrontCustomerId >= 0 ? "E  손님 받기" : "카운터 · 손님 기다리는 중";
                case InteractionKind.Hawk:
                    int wait = HawkWait(sim);
                    return wait > 0 ? $"외치기 {wait}초 뒤" : "E  외치기";
                case InteractionKind.Guard: return "E  경비 부스 대화";
                case InteractionKind.Directory: return "E  층 안내판 읽기";
                default: return "E 꾹 · 붕어빵 직접 굽기";
            }
        }
    }
}
