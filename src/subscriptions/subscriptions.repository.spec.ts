import SubscriptionsRepository from './subscriptions.repository';

const mockPrisma: any = {
  subscription: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
};

const mockUserContext: any = { userId: 'user-1' };

describe('SubscriptionsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);
    expect(repo).toBeDefined();
  });

  describe('getAllSubscriptions', () => {
    it('queries active subscriptions for the current user', async () => {
      const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      await repo.getAllSubscriptions();

      const query = mockPrisma.subscription.findMany.mock.calls[0][0];
      expect(query.where.userId).toBe('user-1');
      expect(query.where.isActive).toBe(true);
    });

    it('applies month and year filters when both are provided', async () => {
      const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      await repo.getAllSubscriptions({ month: 3, year: 2026 });

      const query = mockPrisma.subscription.findMany.mock.calls[0][0];
      expect(query.where.createdAt).toBeDefined();
      expect(query.where.createdAt.gte).toEqual(new Date(2026, 2, 1));
      expect(query.where.createdAt.lt).toEqual(new Date(2026, 3, 1));
    });
  });

  describe('cancelSubscription', () => {
    it('sets isActive to false for the given subscription id', async () => {
      const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);
      const mockSub = { id: 'sub1', isActive: false };
      mockPrisma.subscription.update.mockResolvedValue(mockSub);

      await repo.cancelSubscription('sub1');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub1' },
          data: { isActive: false },
        }),
      );
    });
  });

  describe('updateSubscription', () => {
    it('connects a credit card when creditCardId is provided', async () => {
      const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);
      mockPrisma.subscription.update.mockResolvedValue({});

      await repo.updateSubscription('sub1', { creditCardId: 'card-1' });

      const call = mockPrisma.subscription.update.mock.calls[0][0];
      expect(call.data.creditCard).toEqual({ connect: { id: 'card-1' } });
    });

    it('disconnects a credit card when creditCardId is null', async () => {
      const repo = new SubscriptionsRepository(mockPrisma, mockUserContext);
      mockPrisma.subscription.update.mockResolvedValue({});

      await repo.updateSubscription('sub1', { creditCardId: null });

      const call = mockPrisma.subscription.update.mock.calls[0][0];
      expect(call.data.creditCard).toEqual({ disconnect: true });
    });
  });
});
