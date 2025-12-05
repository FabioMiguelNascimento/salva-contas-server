import { Injectable } from '@nestjs/common';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class MarkAllAsReadUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(): Promise<{ markedCount: number }> {
    const count = await this.notificationsRepository.markAllAsRead();
    return { markedCount: count };
  }
}