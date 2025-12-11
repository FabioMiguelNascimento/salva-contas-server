import { NotificationsRepository } from './notifications.repository';

const mockPrisma: any = {
  transaction: {
    findMany: jest.fn(),
  },
  notification: {
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  }
};

const mockUserContext: any = { userId: 'user-1' };

describe('NotificationsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches for transactions due tomorrow using start and end of day local times', async () => {
    const repo = new NotificationsRepository(mockPrisma, mockUserContext);

    mockPrisma.transaction.findMany.mockResolvedValue([]);

    await repo.generateDueDateNotifications();

    expect(mockPrisma.transaction.findMany).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.transaction.findMany.mock.calls[0][0];
    const { gte, lt } = arg.where.dueDate;
    expect(gte.getHours()).toBe(0);
    expect(gte.getMinutes()).toBe(0);
    expect(gte.getSeconds()).toBe(0);
    expect(lt.getHours()).toBe(23);
    expect(lt.getMinutes()).toBe(59);
  });
});
