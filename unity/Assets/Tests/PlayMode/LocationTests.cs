using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using Unjungcheon.Core;
using Unjungcheon.Game;

namespace Unjungcheon.PlayModeTests
{
    // 생성된 1번 공간 씬을 불러와 이동, 도로 건너가기 금지, 시점 전환, 상호작용 → Core 연결을 확인한다.
    // 입력은 IGameInput 대역으로 주입한다.
    public sealed class LocationTests
    {
        const string ScenePath = "Assets/Scenes/Location1_Skala.unity";
        const float RoadNearEdgeZ = -4f;

        sealed class TestInput : IGameInput
        {
            public Vector2 Move { get; set; }
            public Vector2 Look { get; set; }
            public bool Run { get; set; }
            public bool InteractDown { get; set; }
            public bool ViewDown { get; set; }
        }

        TestInput input;
        PlayerController player;
        CameraRig rig;
        InteractionFinder finder;
        GameRunner runner;

        [UnitySetUp]
        public IEnumerator Load()
        {
            yield return SceneManager.LoadSceneAsync(ScenePath, LoadSceneMode.Single);
            yield return null;
            input = new TestInput();
            player = Object.FindAnyObjectByType<PlayerController>();
            rig = Object.FindAnyObjectByType<CameraRig>();
            finder = Object.FindAnyObjectByType<InteractionFinder>();
            runner = Object.FindAnyObjectByType<GameRunner>();
            Assert.IsNotNull(player, "Owner");
            Assert.IsNotNull(rig, "CameraRig");
            Assert.IsNotNull(finder, "InteractionFinder");
            Assert.IsNotNull(runner, "GameRunner");
            player.InputSource = input;
            rig.InputSource = input;
            finder.InputSource = input;
        }

        IEnumerator Hold(float seconds)
        {
            float end = Time.time + seconds;
            while (Time.time < end) yield return null;
        }

        IEnumerator Press(System.Action<bool> set)
        {
            set(true);
            yield return null;
            set(false);
            yield return null;
        }

        void Teleport(Vector3 position)
        {
            var cc = player.GetComponent<CharacterController>();
            cc.enabled = false;
            player.transform.position = position;
            cc.enabled = true;
        }

        [UnityTest]
        public IEnumerator OwnerWalksAndRuns()
        {
            Teleport(new Vector3(-20f, player.transform.position.y, -6.5f));
            Vector3 start = player.transform.position;
            input.Move = Vector2.right;
            yield return Hold(1f);
            float walked = player.transform.position.x - start.x;
            Assert.That(walked, Is.InRange(1.6f, 2.8f), "걷기 2.2m/s");
            input.Run = true;
            Vector3 mid = player.transform.position;
            yield return Hold(1f);
            float ran = player.transform.position.x - mid.x;
            input.Move = Vector2.zero; input.Run = false;
            Assert.That(ran, Is.InRange(2.7f, 4.2f), "달리기 3.4m/s");
            Assert.Greater(ran, walked);
        }

        [UnityTest]
        public IEnumerator OwnerCannotCrossRoad()
        {
            Teleport(new Vector3(-20f, player.transform.position.y, -6.5f));
            input.Move = Vector2.up;
            input.Run = true;
            yield return Hold(3f);
            input.Move = Vector2.zero; input.Run = false;
            float z = player.transform.position.z;
            Assert.LessOrEqual(z, player.MaxZ + .01f);
            Assert.Less(z, RoadNearEdgeZ, "경계석 안쪽 보도에 머문다");
        }

        [UnityTest]
        public IEnumerator ViewToggleSwitchesCamera()
        {
            Renderer body = rig.BodyRenderers[0];
            Assert.IsFalse(rig.FirstPerson);
            yield return Press(v => input.ViewDown = v);
            Assert.IsTrue(rig.FirstPerson);
            Assert.IsFalse(body.enabled, "1인칭에서는 몸을 숨긴다");
            float eye = rig.transform.position.y - player.transform.position.y;
            Assert.That(eye, Is.EqualTo(CameraRig.EyeHeight).Within(.01f));
            input.Look = new Vector2(10f, 100f);
            yield return null;
            input.Look = Vector2.zero;
            Assert.That(rig.Pitch, Is.GreaterThanOrEqualTo(-CameraRig.PitchLimit));
            yield return Press(v => input.ViewDown = v);
            Assert.IsFalse(rig.FirstPerson);
            Assert.IsTrue(body.enabled);
            Assert.Greater(rig.transform.position.y - player.transform.position.y, 5f, "3인칭은 높은 쿼터뷰");
        }

        [UnityTest]
        public IEnumerator CounterServesFrontCustomer()
        {
            runner.enabled = false; // 손님이 서빙 차례가 될 때까지 시간을 직접 흘린다
            Simulation sim = runner.Simulation;
            int guard = 0;
            while ((sim.FrontCustomerId < 0 || sim.FishTray.Count == 0) && guard++ < 20000) sim.Tick(.05);
            int id = sim.FrontCustomerId;
            Assert.GreaterOrEqual(id, 0, "서빙 차례 손님");
            int money = sim.Money;
            InteractionPoint counter = System.Array.Find(finder.Points, p => p.Kind == InteractionKind.Counter);
            Teleport(new Vector3(counter.transform.position.x, player.transform.position.y, counter.transform.position.z));
            yield return null;
            Assert.AreSame(counter, finder.Nearest);
            yield return Press(v => input.InteractDown = v);
            CustomerState served = sim.Customers.Find(c => c.id == id);
            Assert.IsTrue(served == null || (served.servedNow && served.phase == CustomerPhase.Leave), "ServeNow로 바로 받았다");
            Assert.Greater(sim.Money, money);
        }

        [UnityTest]
        public IEnumerator HawkPointStartsHawk()
        {
            Simulation sim = runner.Simulation;
            InteractionPoint hawk = System.Array.Find(finder.Points, p => p.Kind == InteractionKind.Hawk);
            Teleport(new Vector3(hawk.transform.position.x, player.transform.position.y, hawk.transform.position.z));
            yield return null;
            Assert.AreSame(hawk, finder.Nearest);
            double before = sim.HawkReady;
            yield return Press(v => input.InteractDown = v);
            Assert.Greater(sim.HawkReady, before, "Hawk 쿨다운 시작");
        }
    }
}
