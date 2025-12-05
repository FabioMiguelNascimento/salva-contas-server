import { Injectable } from '@nestjs/common';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(): Promise<{ count: number }> {
    const count = await this.notificationsRepository.getUnreadCount();
    return { count };
  }
}