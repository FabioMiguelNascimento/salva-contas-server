import SubscriptionsRepository from './subscriptions.repository';

const mockPrisma: any = {
  subscription: {
    findMany: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  }
};

const mockUserContext: any = { userId: 'user-1' };

describe('SubscriptionsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries subscriptions using local today values and creates transactions with today as dueDate', async () => {
    const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);

    mockPrisma.subscription.findMany.mockResolvedValue([
      { id: 'sub1', amount: 10, description: 's', category: { name: 'c' }, categoryId: 'cat1', creditCardId: null }
    ]);

    await repo.createRecurringTransactions();

    expect(mockPrisma.subscription.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(1);

    const created = mockPrisma.transaction.create.mock.calls[0][0].data;
    expect(created.dueDate.getHours()).toBe(0);
    expect(created.dueDate.getMinutes()).toBe(0);
  });
});
