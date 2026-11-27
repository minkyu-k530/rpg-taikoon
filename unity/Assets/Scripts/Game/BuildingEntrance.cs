using UnityEngine;

namespace Unjungcheon.Game
{
    [RequireComponent(typeof(BoxCollider))]
    public sealed class BuildingEntrance : MonoBehaviour
    {
        public string Message;
        bool shown;
        void OnTriggerExit(Collider other)
        {
            if (other.GetComponent<PlayerController>() != null) shown = false;
        }
        void OnTriggerEnter(Collider other)
        {
            PlayerController player = other.GetComponent<PlayerController>();
            if (player == null || shown) return;
            shown = true;
            Toast.Show(Message);
            Vector3 back = player.transform.position - transform.position;
            back.y = 0f;
            if (back.sqrMagnitude < .001f) back = Vector3.back;
            player.GetComponent<CharacterController>().Move(back.normalized * .3f);
        }
    }
}
