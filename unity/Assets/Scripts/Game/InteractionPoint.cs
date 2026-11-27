using UnityEngine;

namespace Unjungcheon.Game
{
    public enum InteractionKind { Mold, Counter, Hawk, Guard, Directory }

    // 포장마차의 상호작용 지점. 트리거 반경 안에 들어오면 가장 가까운 지점이 고른다.
    [RequireComponent(typeof(SphereCollider))]
    public sealed class InteractionPoint : MonoBehaviour
    {
        public InteractionKind Kind;
        public string Label;
        public int MoldIndex;
        public float Radius => GetComponent<SphereCollider>().radius;

        public bool Activate(GameRunner runner)
        {
            switch (Kind)
            {
                case InteractionKind.Counter: return runner.ServeNow();
                case InteractionKind.Hawk: return runner.Hawk();
                case InteractionKind.Guard: Toast.Show("교육생들 쉬는 시간이 저녁 여섯 시쯤이에요"); return true;
                case InteractionKind.Directory: Toast.Show("SKALA 교육장 4F"); return true;
                default: return false;
            }
        }
    }
}
