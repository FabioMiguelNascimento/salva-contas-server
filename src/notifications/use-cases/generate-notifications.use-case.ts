import { Injectable } from '@nestjs/common';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class GenerateNotificationsUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(): Promise<void> {
    // Executar todas as gerações de notificações
    await Promise.all([
      this.notificationsRepository.generateDueDateNotifications(),
      this.notificationsRepository.generateBudgetLimitNotifications(),
      this.notificationsRepository.generateSubscriptionRenewalNotifications(),
    ]);
  }
}