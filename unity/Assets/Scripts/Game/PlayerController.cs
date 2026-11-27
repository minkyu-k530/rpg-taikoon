using UnityEngine;

namespace Unjungcheon.Game
{
    // 사장님 이동. 속도는 웹 버전과 같다. 보도 영역 밖(도로)으로는 나가지 못한다.
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        public const float WalkSpeed = 2.2f;
        public const float RunSpeed = 3.4f;
        public float MinX = -40f, MaxX = 40f, MinZ = -8.7f, MaxZ = -4.5f;
        public IGameInput InputSource { get; set; }
        // 1인칭에서는 시선 방향 기준으로 걷는다. 3인칭은 0(캠퍼스 쪽이 위).
        public float MoveYaw { get; set; }
        CharacterController controller;

        void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (InputSource == null) InputSource = GameInputFactory.Create();
        }

        void Update()
        {
            Vector2 move = Vector2.ClampMagnitude(InputSource.Move, 1f);
            if (move.sqrMagnitude < 0.0001f) return;
            Vector3 direction = Quaternion.Euler(0f, MoveYaw, 0f) * new Vector3(move.x, 0f, move.y);
            Vector3 displacement = direction * ((InputSource.Run ? RunSpeed : WalkSpeed) * Time.deltaTime);
            Vector3 p = transform.position;
            displacement.x = Mathf.Clamp(p.x + displacement.x, MinX, MaxX) - p.x;
            displacement.z = Mathf.Clamp(p.z + displacement.z, MinZ, MaxZ) - p.z;
            controller.Move(displacement);
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction),
                Mathf.Min(1f, Time.deltaTime * 9f));
        }
    }
}
