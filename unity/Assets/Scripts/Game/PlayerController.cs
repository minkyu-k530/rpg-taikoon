using UnityEngine;

namespace Unjungcheon.Game
{
    // 장면의 충돌체가 이동 가능한 영역을 정한다.
    [RequireComponent(typeof(CharacterController))]
    public sealed class PlayerController : MonoBehaviour
    {
        public const float WalkSpeed = 2.2f;
        public const float RunSpeed = 3.4f;
        public IGameInput InputSource { get; set; }
        // 1인칭에서는 시선 방향 기준으로 걷는다. 3인칭은 0(캠퍼스 쪽이 위).
        public float MoveYaw { get; set; }
        CharacterController controller;
        float verticalSpeed;

        void Awake()
        {
            controller = GetComponent<CharacterController>();
            if (InputSource == null) InputSource = GameInputFactory.Create();
        }

        void Update()
        {
            Vector2 move = Vector2.ClampMagnitude(InputSource.Move, 1f);
            if (controller.isGrounded)
            {
                if (verticalSpeed < 0f) verticalSpeed = -1f;
                if (InputSource.Jump) verticalSpeed = 4.43f;
            }
            verticalSpeed -= 9.8f * Time.deltaTime;
            Vector3 direction = Quaternion.Euler(0f, MoveYaw, 0f) * new Vector3(move.x, 0f, move.y);
            float control = controller.isGrounded ? 1f : .5f;
            Vector3 displacement = direction * ((InputSource.Run ? RunSpeed : WalkSpeed) * control * Time.deltaTime);
            displacement.y = verticalSpeed * Time.deltaTime;
            CollisionFlags hit = controller.Move(displacement);
            if ((hit & CollisionFlags.Above) != 0 && verticalSpeed > 0f) verticalSpeed = 0f;
            if (direction.sqrMagnitude > .0001f)
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction), Mathf.Min(1f, Time.deltaTime * 9f));
        }
    }
}
