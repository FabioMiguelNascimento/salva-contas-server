import { Injectable } from '@nestjs/common';
import { Notification } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { parseDateLocal } from 'src/utils/date-utils';

@Injectable()
export class NotificationsAutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async generateForAllUsers(): Promise<void> {
    const [transactionUsers, budgetUsers, subscriptionUsers] = await Promise.all([
      this.prisma.transaction.findMany({ distinct: ['userId'], select: { userId: true } }),
      this.prisma.budget.findMany({ distinct: ['userId'], select: { userId: true } }),
      this.prisma.subscription.findMany({ distinct: ['userId'], select: { userId: true } }),
    ]);

    const userIds = [...new Set([
      ...transactionUsers.map((item) => item.userId),
      ...budgetUsers.map((item) => item.userId),
      ...subscriptionUsers.map((item) => item.userId),
    ])];

    await Promise.all(userIds.map((userId) => this.generateForUser(userId)));
  }

  async generateForUser(userId: string): Promise<void> {
    await Promise.all([
      this.generateDueDateNotifications(userId),
      this.generateBudgetLimitNotifications(userId),
      this.generateSubscriptionRenewalNotifications(userId),
    ]);
  }

  private async createNotification(userId: string, data: {
    title: string;
    message: string;
    type: 'due_date' | 'budget_limit' | 'payment_reminder' | 'subscription_renewal' | 'general';
    relatedId?: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async generateDueDateNotifications(userId: string): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = parseDateLocal(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())) as Date;
    const endOfTomorrow = new Date(startOfTomorrow.getTime());
    endOfTomorrow.setHours(23, 59, 59, 999);

    const dueTomorrow = await this.prisma.transaction.findMany({
      where: {
        userId,
        dueDate: {
          gte: startOfTomorrow,
          lt: endOfTomorrow,
        },
        status: 'pending',
      },
    });

    for (const transaction of dueTomorrow) {
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: 'due_date',
          relatedId: transaction.id,
          status: 'unread',
        },
      });

      if (!existingNotification) {
        await this.createNotification(userId, {
          title: 'Conta vence amanhã',
          message: `${transaction.description} (${transaction.categoryName || 'Sem categoria'}) vence amanhã`,
          type: 'due_date',
          relatedId: transaction.id,
        });
      }
    }
  }

  async generateBudgetLimitNotifications(userId: string): Promise<void> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        month: currentMonth,
        year: currentYear,
      },
      include: {
        category: true,
      },
    });

    for (const budget of budgets) {
      const spentResult = await this.prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'expense',
          createdAt: {
            gte: new Date(currentYear, currentMonth - 1, 1),
            lt: new Date(currentYear, currentMonth, 1),
          },
        },
        _sum: {
          amount: true,
        },
      });

      const spent = Number(spentResult._sum?.amount || 0);
      const budgetAmount = Number(budget.amount);
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      if (percentage >= 80) {
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId,
            type: 'budget_limit',
            relatedId: budget.id,
            status: 'unread',
          },
        });

        if (!existingNotification) {
          await this.createNotification(userId, {
            title: 'Orçamento próximo do limite',
            message: `Orçamento de ${budget.category.name} está em ${percentage.toFixed(1)}% (${spent.toFixed(2)} de ${budgetAmount.toFixed(2)})`,
            type: 'budget_limit',
            relatedId: budget.id,
          });
        }
      }
    }
  }

  async generateSubscriptionRenewalNotifications(userId: string): Promise<void> {
    const renewingSubscriptions = await this.prisma.subscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    for (const subscription of renewingSubscriptions) {
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: 'subscription_renewal',
          relatedId: subscription.id,
          status: 'unread',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existingNotification) {
        await this.createNotification(userId, {
          title: 'Renovação de assinatura',
          message: `Assinatura ${subscription.description} será renovada em breve`,
          type: 'subscription_renewal',
          relatedId: subscription.id,
        });
      }
    }
  }
}
