import { Injectable } from '@nestjs/common';
import { Notification } from 'generated/prisma/client';
import { CreateNotificationInput } from 'src/schemas/notifications.schema';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class CreateNotificationUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(data: CreateNotificationInput): Promise<Notification> {
    return this.notificationsRepository.createNotification(data);
  }
}