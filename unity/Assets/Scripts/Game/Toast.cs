using UnityEngine;
using UnityEngine.UI;

namespace Unjungcheon.Game
{
    public sealed class Toast : MonoBehaviour
    {
        public static Toast Active { get; private set; }
        public Text Message;
        float until;
        void Awake() { Active = this; if (Message != null) Message.transform.parent.gameObject.SetActive(false); }
        void OnDestroy() { if (Active == this) Active = null; }
        void Update() { if (Message != null && Message.transform.parent.gameObject.activeSelf && Time.time >= until) Message.transform.parent.gameObject.SetActive(false); }
        public static void Show(string message, float seconds = 2.5f)
        {
            if (Active == null || Active.Message == null) return;
            Active.Message.text = message;
            Active.Message.transform.parent.gameObject.SetActive(true);
            Active.until = Time.time + seconds;
        }
    }
}
