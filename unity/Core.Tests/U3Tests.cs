using System;
using Unjungcheon.Core;
using Xunit;

public class U3Tests
{
    [Fact]
    public void GroupOrderChangesLoyaltyOnlyForEmployeeSale()
    {
        var sim = new Simulation(new SeedRandom(7));
        Assert.False(sim.OfferGroupOrder(CustomerKind.General, 0, 12));
        Assert.True(sim.OfferGroupOrder(CustomerKind.Employee, 0, 12));
        int quantity = sim.GroupOrder.quantity;
        Assert.InRange(quantity, 6, 9);
        Assert.True(sim.AcceptGroupOrder());
        for (int i = 0; i < quantity; i++) sim.FishTray.Add(new QualityScore { batter = 18, filling = 20, cook = 36 });
        Assert.True(sim.MoveTrayToGroupBox());
        Assert.True(sim.DeliverGroupOrder());
        Assert.Equal(10, sim.EmployeeLoyalty);
        Assert.Equal(2, sim.Reputation - 50);
        Assert.Equal(quantity, sim.Stats.sold);
        var saved = sim.Snapshot(); var restored = new Simulation(new SeedRandom(1)); restored.Restore(saved);
        Assert.Equal(10, restored.EmployeeLoyalty);
        Assert.True(restored.OfferGroupOrder(CustomerKind.Employee, 0, 8));
        Assert.True(restored.AcceptGroupOrder());
        restored.Tick(Balance.GroupBaseDuration + restored.GroupOrder.quantity * Balance.GroupSecondsPerFish + .1);
        Assert.Equal(5, restored.EmployeeLoyalty);
        Assert.Null(restored.GroupOrder);
    }

    [Fact]
    public void GroupBoxTakesOnlyHandBakedFish()
    {
        var sim = new Simulation(new SeedRandom(3));
        Assert.True(sim.OfferGroupOrder(CustomerKind.Employee, 0, 8));
        Assert.True(sim.AcceptGroupOrder());
        int baked = 0;
        sim.OnEvent += e => { if (e.kind == SimEventKind.BakeComplete) baked++; };
        sim.Tick(Balance.FishAutoTime + 2);
        Assert.True(baked > 0);
        Assert.Equal(0, sim.GroupOrder.boxCount);
        for (int step = 0; step < 3; step++)
        {
            Assert.True(sim.HoldStart(0));
            sim.Tick(step == 1 ? .8 : .5);
            Assert.True(sim.HoldEnd(0));
        }
        sim.Tick(Balance.FishCookMin + .5);
        Assert.True(sim.TakeOut(0));
        Assert.Equal(1, sim.GroupOrder.boxCount);
        Assert.True(sim.GroupOrder.box[0].Total > 70);
    }

    [Fact]
    public void GlaresTriggerGuardBanAndDecay()
    {
        var sim = new Simulation(new SeedRandom(1));
        sim.RecordInviteFailure(); sim.RecordInviteFailure();
        Assert.Equal(2, sim.Glares);
        sim.Tick(Balance.GlareDecayTime + .1);
        Assert.Equal(1, sim.Glares);
        sim.RecordInviteFailure(); sim.RecordInviteFailure();
        Assert.Equal(0, sim.Glares);
        Assert.Equal(45, sim.Reputation);
        Assert.True(sim.CampusInviteBanned);
        Assert.False(sim.CanInvite(true));
        Assert.True(sim.CanInvite(false));
        var copy = new Simulation(new SeedRandom(2)); copy.Restore(sim.Snapshot());
        Assert.True(copy.CampusInviteBanned);
        sim.Tick(Balance.GuardBanTime + .1);
        Assert.False(sim.CampusInviteBanned);
    }

    [Fact]
    public void KindSharesAreNearPlannedValues()
    {
        var sim = new Simulation(new SeedRandom(2));
        int employee = 0, trainee = 0, general = 0;
        for (int id = 1; id <= 10000; id++)
        {
            switch (sim.RollCustomerKind(id))
            {
                case CustomerKind.Employee: employee++; break;
                case CustomerKind.Trainee: trainee++; break;
                default: general++; break;
            }
        }
        Assert.InRange(employee, 3400, 3600);
        Assert.InRange(trainee, 2900, 3100);
        Assert.InRange(general, 3400, 3600);
    }
}
