using UnityEngine;

namespace Unjungcheon.Game
{
    // 사장님 주변에서 가장 가까운 상호작용 지점을 고르고, E/Space로 실행한다.
    public sealed class InteractionFinder : MonoBehaviour
    {
        public GameRunner Runner;
        public InteractionPoint[] Points;
        float[] radii;
        public IGameInput InputSource { get; set; }
        public InteractionPoint Nearest { get; private set; }
        public int Activations { get; private set; }

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
            if (best != null && Runner != null && InputSource.InteractDown)
            {
                Activations++;
                best.Activate(Runner);
            }
        }
    }
}
