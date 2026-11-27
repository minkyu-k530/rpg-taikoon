using UnityEngine;

namespace Unjungcheon.Game
{
    public sealed class Pedestrian : MonoBehaviour
    {
        public Vector3 StartPoint, EndPoint, StallPoint;
        public float Speed = 1.2f;
        public bool DoorFlow;
        public Core.CustomerKind Kind;
        public bool DidAttempt { get; private set; }
        public bool InvitedOrAsked { get; private set; }
        public bool GoingToStall { get; private set; }
        float shakeUntil;
        void Update()
        {
            if (Time.time < shakeUntil) return;
            Vector3 target = GoingToStall ? StallPoint : EndPoint;
            Vector3 delta = target - transform.position;
            delta.y = 0f;
            if (delta.sqrMagnitude < .04f)
            {
                ResetToStart();
                return;
            }
            transform.position = Vector3.MoveTowards(transform.position, target, Speed * Time.deltaTime);
            transform.rotation = Quaternion.LookRotation(delta);
        }
        public void ResetToStart()
        {
            transform.position = StartPoint;
            InvitedOrAsked = false; GoingToStall = false; shakeUntil = 0f;
            gameObject.SetActive(true);
        }
        public bool TryInvite(GameRunner runner, float roll)
        {
            DidAttempt = false;
            bool campus = transform.position.z >= InviteZone.CampusStartZ;
            if (InvitedOrAsked || runner == null || !runner.Simulation.CanInvite(campus) || (Pedestrians.Active != null && !Pedestrians.Active.CanAttempt)) return false;
            if (!runner.Simulation.CanInviteMore()) { Toast.Show("줄이 꽉 찼어요"); return false; }
            DidAttempt = true;
            Pedestrians.Active?.RecordAttempt();
            InvitedOrAsked = true;
            Toast.Show("따끈한 붕어빵 있어요!");
            if (roll < Core.Balance.InviteChance)
            {
                if (runner.Invite(Kind, campus)) { GoingToStall = true; return true; }
                return false;
            }
            runner.Simulation.RecordInviteFailure();
            shakeUntil = Time.time + .5f;
            transform.Rotate(0f, 25f, 0f);
            return false;
        }
    }
}
