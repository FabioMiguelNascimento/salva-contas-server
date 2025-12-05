import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class DeleteNotificationUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(id: string): Promise<void> {
    try {
      await this.notificationsRepository.deleteNotification(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Notification not found');
      }
      throw error;
    }
  }
}