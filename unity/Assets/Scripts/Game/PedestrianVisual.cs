using UnityEngine;

namespace Unjungcheon.Game
{
    public sealed class PedestrianVisual : MonoBehaviour
    {
        public Transform[] Arms, Legs;
        public Transform Torso, Badge, TypeIcon;
        Transform player, view;
        void Start()
        {
            if (Camera.main != null)
            {
                view = Camera.main.transform;
                var rig = Camera.main.GetComponent<CameraRig>();
                if (rig != null) player = rig.Target;
            }
        }
        void Update()
        {
            float step = Mathf.Sin(Time.time * 7f + transform.GetSiblingIndex());
            for (int i = 0; i < 2; i++)
            {
                float angle = step * (i == 0 ? 1f : -1f) * 23f;
                Arms[i].localRotation = Quaternion.Euler(angle, 0f, 0f);
                Legs[i].localRotation = Quaternion.Euler(-angle, 0f, 0f);
            }
            Torso.localRotation = Quaternion.Euler(0f, 0f, step * 2f);
            if (Badge != null) Badge.localRotation = Quaternion.Euler(step * 7f, 0f, 0f);
            if (TypeIcon != null && player != null)
            {
                bool nearby = (player.position - transform.position).sqrMagnitude <= 64f;
                if (TypeIcon.gameObject.activeSelf != nearby) TypeIcon.gameObject.SetActive(nearby);
                if (nearby && view != null) TypeIcon.rotation = view.rotation;
            }
        }
    }
}
