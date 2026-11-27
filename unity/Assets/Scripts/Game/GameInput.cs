using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace Unjungcheon.Game
{
    // 이동 벡터, 달리기, 상호작용(E/Space), 시점 전환(V), 시선(마우스 델타).
    // 프로젝트 입력 설정에 따라 Input System 또는 Input Manager 구현을 쓴다.
    public interface IGameInput
    {
        Vector2 Move { get; }
        Vector2 Look { get; }
        bool Run { get; }
        bool InteractDown { get; }
        bool ViewDown { get; }
    }

#if ENABLE_INPUT_SYSTEM
    public sealed class SystemGameInput : IGameInput
    {
        static bool Held(Key a, Key b) => Keyboard.current != null &&
            (Keyboard.current[a].isPressed || Keyboard.current[b].isPressed);
        public Vector2 Move => new Vector2((Held(Key.D, Key.RightArrow) ? 1 : 0) - (Held(Key.A, Key.LeftArrow) ? 1 : 0),
            (Held(Key.W, Key.UpArrow) ? 1 : 0) - (Held(Key.S, Key.DownArrow) ? 1 : 0));
        // 레거시 "Mouse X/Y" 축과 같은 단위(픽셀 x 0.1)로 맞춘다.
        public Vector2 Look => Mouse.current == null ? Vector2.zero : Mouse.current.delta.ReadValue() * 0.1f;
        public bool Run => Held(Key.LeftShift, Key.RightShift);
        public bool InteractDown => Keyboard.current != null && (Keyboard.current.eKey.wasPressedThisFrame || Keyboard.current.spaceKey.wasPressedThisFrame);
        public bool ViewDown => Keyboard.current != null && Keyboard.current.vKey.wasPressedThisFrame;
    }
#endif

#if ENABLE_LEGACY_INPUT_MANAGER
    public sealed class LegacyGameInput : IGameInput
    {
        public Vector2 Move => new Vector2((Input.GetKey(KeyCode.D) || Input.GetKey(KeyCode.RightArrow) ? 1 : 0) -
            (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.LeftArrow) ? 1 : 0),
            (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.UpArrow) ? 1 : 0) -
            (Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow) ? 1 : 0));
        public Vector2 Look => new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y"));
        public bool Run => Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        public bool InteractDown => Input.GetKeyDown(KeyCode.E) || Input.GetKeyDown(KeyCode.Space);
        public bool ViewDown => Input.GetKeyDown(KeyCode.V);
    }
#endif

    public static class GameInputFactory
    {
        public static IGameInput Create()
        {
#if ENABLE_INPUT_SYSTEM
            return new SystemGameInput();
#elif ENABLE_LEGACY_INPUT_MANAGER
            return new LegacyGameInput();
#else
            return new NoGameInput();
#endif
        }
    }

    sealed class NoGameInput : IGameInput
    {
        public Vector2 Move => Vector2.zero;
        public Vector2 Look => Vector2.zero;
        public bool Run => false;
        public bool InteractDown => false;
        public bool ViewDown => false;
    }
}
