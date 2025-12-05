import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification } from 'generated/prisma/client';
import { NotificationsRepositoryInterface } from '../notifications.interface';

@Injectable()
export class MarkAsReadUseCase {
  constructor(private readonly notificationsRepository: NotificationsRepositoryInterface) {}

  async execute(id: string): Promise<Notification> {
    try {
      return await this.notificationsRepository.markAsRead(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Notification not found');
      }
      throw error;
    }
  }
}