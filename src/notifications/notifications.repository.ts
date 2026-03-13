import { Injectable, Scope } from '@nestjs/common';
import { Notification } from 'generated/prisma/client';
import { NotificationsAutomationService } from 'src/notifications/notifications-automation.service';
import { UserContext } from '../auth/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsRepositoryInterface } from './notifications.interface';

@Injectable({ scope: Scope.REQUEST })
export class NotificationsRepository implements NotificationsRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
    private readonly notificationsAutomationService: NotificationsAutomationService,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async createNotification(data: {
    title: string;
    message: string;
    type: 'due_date' | 'budget_limit' | 'payment_reminder' | 'subscription_renewal' | 'general';
    relatedId?: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        ...data,
        userId: this.userId,
      },
    });
  }

  async getNotifications(status?: 'read' | 'unread', limit = 50): Promise<Notification[]> {
    const where: any = { userId: this.userId };

    if (status) {
      where.status = status;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: this.userId,
        status: 'unread',
      },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async deleteNotification(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId: this.userId,
        status: 'unread',
      },
    });
  }

  async generateDueDateNotifications(): Promise<void> {
    await this.notificationsAutomationService.generateDueDateNotifications(this.userId);
  }

  async generateBudgetLimitNotifications(): Promise<void> {
    await this.notificationsAutomationService.generateBudgetLimitNotifications(this.userId);
  }

  async generateSubscriptionRenewalNotifications(): Promise<void> {
    await this.notificationsAutomationService.generateSubscriptionRenewalNotifications(this.userId);
  }
}