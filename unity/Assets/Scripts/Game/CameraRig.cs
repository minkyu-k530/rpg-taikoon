using UnityEngine;

namespace Unjungcheon.Game
{
    // 3인칭 경영 뷰와 1인칭 사장 시점. V로 바꾼다. 바꿔도 시뮬레이션은 멈추지 않는다.
    public sealed class CameraRig : MonoBehaviour
    {
        public const float EyeHeight = 1.6f;
        public const float PitchLimit = 70f;
        public const float LookDegrees = 2f;     // 입력 Look 한 단위당 각도
        public static readonly Vector3 ThirdOffset = new Vector3(-3f, 7.5f, -11f);
        public static readonly Vector3 ThirdAim = new Vector3(1.5f, 3f, 14f);

        public Transform Target;
        public PlayerController Player;
        public Renderer[] BodyRenderers;
        public IGameInput InputSource { get; set; }
        public bool FirstPerson { get; private set; }
        public float Yaw { get; private set; }
        public float Pitch { get; private set; }

        void Awake() { if (InputSource == null) InputSource = GameInputFactory.Create(); }

        void Start() { if (Target != null) SnapThirdPerson(); }

        public static void ThirdPersonPose(Vector3 target, out Vector3 position, out Quaternion rotation)
        {
            position = target + ThirdOffset;
            rotation = Quaternion.LookRotation(target + ThirdAim - position);
        }

        public static void FirstPersonPose(Vector3 target, float yaw, float pitch, out Vector3 position, out Quaternion rotation)
        {
            position = target + Vector3.up * EyeHeight;
            rotation = Quaternion.Euler(pitch, yaw, 0f);
        }

        public void SnapThirdPerson()
        {
            ThirdPersonPose(Target.position, out Vector3 p, out Quaternion r);
            transform.SetPositionAndRotation(p, r);
        }

        public void SetFirstPerson(bool value)
        {
            FirstPerson = value;
            if (BodyRenderers != null) foreach (Renderer body in BodyRenderers) if (body != null) body.enabled = !value;
            if (value) { Yaw = 0f; Pitch = 0f; }
            if (Player != null) Player.MoveYaw = value ? Yaw : 0f;
            if (!value && Target != null) SnapThirdPerson();
        }

        void LateUpdate()
        {
            if (Target == null) return;
            if (InputSource.ViewDown) SetFirstPerson(!FirstPerson);
            if (FirstPerson)
            {
                Vector2 look = InputSource.Look;
                Yaw = Mathf.Repeat(Yaw + look.x * LookDegrees, 360f);
                Pitch = Mathf.Clamp(Pitch - look.y * LookDegrees, -PitchLimit, PitchLimit);
                if (Player != null) Player.MoveYaw = Yaw;
                FirstPersonPose(Target.position, Yaw, Pitch, out Vector3 p, out Quaternion r);
                transform.SetPositionAndRotation(p, r);
            }
            else
            {
                ThirdPersonPose(Target.position, out Vector3 p, out Quaternion r);
                float k = 1f - Mathf.Exp(-6f * Time.deltaTime);
                transform.SetPositionAndRotation(Vector3.Lerp(transform.position, p, k), Quaternion.Slerp(transform.rotation, r, k));
            }
        }
    }
}
