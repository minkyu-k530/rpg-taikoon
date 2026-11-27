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
            InteractionPoint point = Finder == null ? null : Finder.Nearest;
            int key = PromptKey(point, sim);
            if (key != promptKey)
            {
                promptKey = key;
                Prompt.text = PromptText(point, sim);
            }
        }

        static int HawkWait(Simulation sim) => Mathf.CeilToInt((float)(sim.HawkReady - sim.Clock));

        static int PromptKey(InteractionPoint point, Simulation sim)
        {
            if (point == null) return -1;
            switch (point.Kind)
            {
                case InteractionKind.Counter: return sim.FrontCustomerId >= 0 ? 10 : 11;
                case InteractionKind.Hawk: return 1000 + Mathf.Max(0, HawkWait(sim));
                default: return 20;
            }
        }

        static string PromptText(InteractionPoint point, Simulation sim)
        {
            if (point == null) return "";
            switch (point.Kind)
            {
                case InteractionKind.Counter: return sim.FrontCustomerId >= 0 ? "E  손님 받기" : "카운터 · 손님 기다리는 중";
                case InteractionKind.Hawk:
                    int wait = HawkWait(sim);
                    return wait > 0 ? $"호객 {wait}초 뒤" : "E  호객";
                default: return point.Label + " · 직접 굽기는 다음 단계";
            }
        }
    }
}
