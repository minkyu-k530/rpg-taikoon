using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using Unjungcheon.Core;
using Unjungcheon.Game;

namespace Unjungcheon.PlayModeTests
{
    public sealed class U3PlayModeTests
    {
        const string ScenePath = "Assets/Scenes/Location1_Skala.unity";

        [UnityTest]
        public IEnumerator CookingThreeHoldsAndTakingOutAddsFish()
        {
            SceneManager.LoadScene(ScenePath);
            yield return null;
            var runner = Object.FindAnyObjectByType<GameRunner>();
            var cooking = Object.FindAnyObjectByType<FishCookingController>();
            Assert.True(cooking.StartHold(0));
            runner.Simulation.Tick(.46); Assert.True(cooking.EndHold());
            Assert.True(cooking.StartHold(0));
            runner.Simulation.Tick(.8); Assert.True(cooking.EndHold());
            Assert.True(cooking.StartHold(0));
            runner.Simulation.Tick(.49); Assert.True(cooking.EndHold());
            runner.Simulation.Tick(19);
            int before = runner.Simulation.FishTray.Count;
            Assert.True(cooking.TakeOut(0));
            Assert.AreEqual(before + 1, runner.Simulation.FishTray.Count);
            Assert.GreaterOrEqual(runner.Simulation.FishTray[runner.Simulation.FishTray.Count - 1].Total, 74);
        }

        [UnityTest]
        public IEnumerator AcceptedGroupDeliveryRaisesLoyalty()
        {
            SceneManager.LoadScene(ScenePath);
            yield return null;
            var sim = Object.FindAnyObjectByType<GameRunner>().Simulation;
            Assert.True(sim.OfferGroupOrder(CustomerKind.Employee, 0, 8));
            Assert.True(sim.AcceptGroupOrder());
            for (int i = sim.FishTray.Count; i < 8; i++) sim.FishTray.Add(new QualityScore { batter = 18, filling = 20, cook = 36 });
            Assert.True(sim.MoveTrayToGroupBox());
            Assert.True(sim.DeliverGroupOrder());
            Assert.AreEqual(10, sim.EmployeeLoyalty);
        }
    }
}
