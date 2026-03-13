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
const mockNotificationsAutomationService: any = {
  generateDueDateNotifications: jest.fn(),
};

describe('NotificationsRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates due date notification generation to automation service using the current user id', async () => {
    const repo = new NotificationsRepository(mockPrisma, mockUserContext, mockNotificationsAutomationService);

    await repo.generateDueDateNotifications();

    expect(mockNotificationsAutomationService.generateDueDateNotifications).toHaveBeenCalledTimes(1);
    expect(mockNotificationsAutomationService.generateDueDateNotifications).toHaveBeenCalledWith('user-1');
  });
});
