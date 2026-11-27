using UnityEngine;

namespace Unjungcheon.Game
{
    // 사장님 주변에서 가장 가까운 상호작용 지점을 고르고 E로 실행한다.
    public sealed class InteractionFinder : MonoBehaviour
    {
        public GameRunner Runner;
        public InteractionPoint[] Points;
        float[] radii;
        public IGameInput InputSource { get; set; }
        public InteractionPoint Nearest { get; private set; }
        public Pedestrian NearestPedestrian { get; private set; }
        public int Activations { get; private set; }
        public float InviteRollOverride = -1f;

        void Awake() { if (InputSource == null) InputSource = GameInputFactory.Create(); }

        void Start()
        {
            radii = new float[Points == null ? 0 : Points.Length];
            for (int i = 0; i < radii.Length; i++) radii[i] = Points[i].Radius;
        }

        void Update()
        {
            InteractionPoint best = null;
            float bestDistance = float.MaxValue;
            Vector3 me = transform.position;
            for (int i = 0; i < radii.Length; i++)
            {
                Vector3 d = Points[i].transform.position - me;
                float distance = d.x * d.x + d.z * d.z;
                if (distance <= radii[i] * radii[i] && distance < bestDistance) { bestDistance = distance; best = Points[i]; }
            }
            Nearest = best;
            NearestPedestrian = null;
            if (Pedestrians.Active != null)
            {
                Pedestrian[] people = Pedestrians.Active.People;
                for (int i = 0; i < people.Length; i++)
                {
                    Pedestrian person = people[i];
                    if (!person.gameObject.activeSelf || person.InvitedOrAsked) continue;
                    Vector3 d = person.transform.position - me;
                    float distance = d.x * d.x + d.z * d.z;
                    if (distance <= 4f && distance < bestDistance) { bestDistance = distance; best = null; NearestPedestrian = person; }
                }
            }
            Nearest = best;
            if (Runner != null && InputSource.GroupAcceptDown)
            {
                if (Runner.Simulation.GroupOrder != null && !Runner.Simulation.GroupOrder.accepted)
                {
                    if (Runner.Simulation.AcceptGroupOrder()) Toast.Show("단체 주문 수락! F를 다시 누르면 진열대 재고를 상자로 옮깁니다");
                }
                else if (Runner.Simulation.MoveTrayToGroupBox()) Toast.Show("붕어빵을 주문 상자로 옮겼습니다");
            }
            if (Runner != null && InputSource.GroupDeclineDown && Runner.Simulation.DeclineGroupOrder()) Toast.Show("단체 주문 거절");
            if (Runner != null && InputSource.InteractDown && NearestPedestrian != null)
            {
                NearestPedestrian.TryInvite(Runner, InviteRollOverride >= 0f ? InviteRollOverride : Random.value);
                if (NearestPedestrian.DidAttempt) { Activations++; Tutorial.Active?.OnInviteAttempt(); }
            }
            else if (best != null && Runner != null && InputSource.InteractDown)
            {
                if (best.Kind == InteractionKind.Mold) return;
                Activations++;
                if (best.Kind == InteractionKind.Counter && Runner.Simulation.CanDeliverGroupOrder)
                {
                    // 상자가 덜 찼으면 진열대 재고로 채운 뒤 전달한다.
                    Runner.Simulation.MoveTrayToGroupBox();
                    Runner.Simulation.DeliverGroupOrder();
                }
                else if (best.Activate(Runner) && best.Kind == InteractionKind.Counter) Tutorial.Active?.OnServe();
            }
        }
    }
}
