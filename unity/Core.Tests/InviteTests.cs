using Unjungcheon.Core;
using Xunit;

public class InviteTests
{
    [Fact]
    public void InviteAddsOneCustomerAndEmitsArrival()
    {
        var sim = new Simulation(new SeedRandom(31));
        int arrived = -1;
        sim.OnEvent += e => { if (e.kind == SimEventKind.CustomerArrived) arrived = e.id; };
        Assert.True(sim.Invite());
        Assert.Single(sim.Customers);
        Assert.Equal(sim.Customers[0].id, arrived);
        Assert.Equal(CustomerPhase.Queue, sim.Customers[0].phase);
        Assert.False(sim.Invite());
        Assert.Equal(Balance.InviteCooldown, sim.InviteReady);
    }

    [Fact]
    public void InviteRespectsQueueLimitAndClosedDay()
    {
        var sim = new Simulation(new SeedRandom(13));
        for (int i = 0; i < Balance.QueueMax; i++)
            sim.Customers.Add(new CustomerState { id = 100 + i, phase = CustomerPhase.Queue });
        Assert.False(sim.Invite());
        sim.Customers.Clear();
        sim.Tick(Balance.DayLength);
        Assert.False(sim.Invite());
    }

    [Fact]
    public void InviteCooldownSurvivesSave()
    {
        var sim = new Simulation(new SeedRandom(7));
        Assert.True(sim.Invite());
        var restored = new Simulation(new SeedRandom(99));
        restored.Restore(sim.Snapshot());
        Assert.False(restored.Invite());
        Assert.Equal(sim.InviteReady, restored.InviteReady);
    }
}
