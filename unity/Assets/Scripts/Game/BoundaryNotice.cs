using UnityEngine;

namespace Unjungcheon.Game
{
    [RequireComponent(typeof(BoxCollider))]
    public sealed class BoundaryNotice : MonoBehaviour
    {
        void OnTriggerEnter(Collider other)
        {
            if (other.GetComponent<PlayerController>() != null) Toast.Show("아직 가 볼 수 없는 곳이다");
        }
    }
}
