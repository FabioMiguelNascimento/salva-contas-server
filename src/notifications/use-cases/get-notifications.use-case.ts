import { Injectable } from '@nestjs/common';
import { Notification } from 'generated/prisma/client';
import { GetNotificationsInput } from 'src/schemas/notifications.schema';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class GetNotificationsUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(filters?: GetNotificationsInput): Promise<Notification[]> {
    return this.notificationsRepository.getNotifications(filters?.status, filters?.limit);
  }
}