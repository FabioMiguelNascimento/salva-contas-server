import { Notification } from 'generated/prisma/client';

export abstract class NotificationsRepositoryInterface {
  abstract createNotification(data: {
    title: string;
    message: string;
    type: 'due_date' | 'budget_limit' | 'payment_reminder' | 'subscription_renewal' | 'general';
    relatedId?: string;
  }): Promise<Notification>;

  abstract getNotifications(status?: 'read' | 'unread', limit?: number): Promise<Notification[]>;

  abstract markAsRead(id: string): Promise<Notification>;

  abstract markAllAsRead(): Promise<number>;

  abstract deleteNotification(id: string): Promise<void>;

  abstract getUnreadCount(): Promise<number>;

  // Métodos para gerar notificações automaticamente
  abstract generateDueDateNotifications(): Promise<void>;
  abstract generateBudgetLimitNotifications(): Promise<void>;
  abstract generateSubscriptionRenewalNotifications(): Promise<void>;
}