import SubscriptionSchedulerService from './subscription-scheduler.service';

const mockPrisma: any = {
  subscription: {
    findMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
};

describe('SubscriptionSchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates transactions for all matching subscriptions with correct fields and today as dueDate', async () => {
    const scheduler = new SubscriptionSchedulerService(mockPrisma);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub1',
        userId: 'user-1',
        amount: 10,
        description: 'Netflix',
        category: { name: 'Entertainment' },
        categoryId: 'cat1',
        creditCardId: null,
      },
    ]);

    await scheduler.handleRecurringSubscriptions();

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);

    const created = mockPrisma.transaction.create.mock.calls[0][0].data;
    expect(created.userId).toBe('user-1');
    expect(created.category).toBe('Entertainment');
    expect(created.categoryName).toBe('Entertainment');
    expect(created.categoryRel).toEqual({ connect: { id: 'cat1' } });
    expect(created.type).toBe('expense');
    expect(created.status).toBe('pending');
    expect(created.dueDate.getHours()).toBe(0);
    expect(created.dueDate.getMinutes()).toBe(0);
  });

  it('connects a credit card when the subscription has one', async () => {
    const scheduler = new SubscriptionSchedulerService(mockPrisma);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub2',
        userId: 'user-2',
        amount: 15,
        description: 'Spotify',
        category: { name: 'Music' },
        categoryId: 'cat2',
        creditCardId: 'card-1',
      },
    ]);

    await scheduler.handleRecurringSubscriptions();

    const created = mockPrisma.transaction.create.mock.calls[0][0].data;
    expect(created.creditCard).toEqual({ connect: { id: 'card-1' } });
  });

  it('does not set creditCard when subscription has no credit card', async () => {
    const scheduler = new SubscriptionSchedulerService(mockPrisma);

    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: 'sub3',
        userId: 'user-3',
        amount: 20,
        description: 'Service',
        category: { name: 'Services' },
        categoryId: 'cat3',
        creditCardId: null,
      },
    ]);

    await scheduler.handleRecurringSubscriptions();

    const created = mockPrisma.transaction.create.mock.calls[0][0].data;
    expect(created.creditCard).toBeUndefined();
  });

  it('queries subscriptions without filtering by userId (processes all users)', async () => {
    const scheduler = new SubscriptionSchedulerService(mockPrisma);

    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await scheduler.handleRecurringSubscriptions();

    const query = mockPrisma.subscription.findMany.mock.calls[0][0];
    expect(query.where).not.toHaveProperty('userId');
    expect(query.where).toHaveProperty('isActive', true);
  });
});