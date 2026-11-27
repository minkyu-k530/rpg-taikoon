using UnityEngine;

namespace Unjungcheon.Game
{
    public enum InteractionKind { Mold, Counter, Hawk }

    // 포장마차의 상호작용 지점. 트리거 반경 안에 들어오면 가장 가까운 지점이 고른다.
    [RequireComponent(typeof(SphereCollider))]
    public sealed class InteractionPoint : MonoBehaviour
    {
        public InteractionKind Kind;
        public string Label;
        public float Radius => GetComponent<SphereCollider>().radius;

        public bool Activate(GameRunner runner)
        {
            switch (Kind)
            {
                case InteractionKind.Counter: return runner.ServeNow();
                case InteractionKind.Hawk: return runner.Hawk();
                default: return false; // 붕어빵 홀드 조리는 다음 단계(U3)
            }
        }
    }
}
