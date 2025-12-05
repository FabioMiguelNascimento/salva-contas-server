import { Injectable } from '@nestjs/common';
import { Notification } from 'generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsRepositoryInterface } from './notifications.interface';

@Injectable()
export class NotificationsRepository implements NotificationsRepositoryInterface {
  private readonly DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: {
    title: string;
    message: string;
    type: 'due_date' | 'budget_limit' | 'payment_reminder' | 'subscription_renewal' | 'general';
    relatedId?: string;
  }): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        ...data,
        userId: this.DEV_USER_ID,
      },
    });
  }

  async getNotifications(status?: 'read' | 'unread', limit = 50): Promise<Notification[]> {
    const where: any = { userId: this.DEV_USER_ID };

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
        userId: this.DEV_USER_ID,
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
        userId: this.DEV_USER_ID,
        status: 'unread',
      },
    });
  }

  async generateDueDateNotifications(): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueTomorrow = await this.prisma.transaction.findMany({
      where: {
        userId: this.DEV_USER_ID,
        dueDate: {
          gte: new Date(tomorrow.toDateString()),
          lt: new Date(tomorrow.toDateString() + ' 23:59:59'),
        },
        status: 'pending',
      },
    });

    for (const transaction of dueTomorrow) {
      // Verificar se já existe notificação para esta transação
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId: this.DEV_USER_ID,
          type: 'due_date',
          relatedId: transaction.id,
          status: 'unread',
        },
      });

      if (!existingNotification) {
        await this.createNotification({
          title: 'Conta vence amanhã',
          message: `${transaction.description} (${transaction.categoryName || 'Sem categoria'}) vence amanhã`,
          type: 'due_date',
          relatedId: transaction.id,
        });
      }
    }
  }

  async generateBudgetLimitNotifications(): Promise<void> {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Buscar progresso dos budgets
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId: this.DEV_USER_ID,
        month: currentMonth,
        year: currentYear,
      },
      include: {
        category: true,
      },
    });

    for (const budget of budgets) {
      // Calcular gasto atual
      const spentResult = await this.prisma.transaction.aggregate({
        where: {
          userId: this.DEV_USER_ID,
          category: budget.category.name,
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

      const spent = Number(spentResult._sum.amount || 0);
      const budgetAmount = Number(budget.amount);
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      // Se passou de 80% e não tem notificação ativa
      if (percentage >= 80) {
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: this.DEV_USER_ID,
            type: 'budget_limit',
            relatedId: budget.id,
            status: 'unread',
          },
        });

        if (!existingNotification) {
          await this.createNotification({
            title: 'Orçamento próximo do limite',
            message: `Orçamento de ${budget.category.name} está em ${percentage.toFixed(1)}% (${spent.toFixed(2)} de ${budgetAmount.toFixed(2)})`,
            type: 'budget_limit',
            relatedId: budget.id,
          });
        }
      }
    }
  }

  async generateSubscriptionRenewalNotifications(): Promise<void> {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const renewingSubscriptions = await this.prisma.subscription.findMany({
      where: {
        userId: this.DEV_USER_ID,
        isActive: true,
        // Para assinaturas mensais, verificar próximas renovações
        // Isso seria mais complexo na implementação real
      },
    });

    // Por enquanto, apenas um exemplo básico
    for (const subscription of renewingSubscriptions) {
      // Lógica para calcular próximas renovações baseada na frequência
      // Por simplicidade, vamos criar uma notificação semanal para assinaturas ativas
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId: this.DEV_USER_ID,
          type: 'subscription_renewal',
          relatedId: subscription.id,
          status: 'unread',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
          },
        },
      });

      if (!existingNotification) {
        await this.createNotification({
          title: 'Renovação de assinatura',
          message: `Assinatura ${subscription.description} será renovada em breve`,
          type: 'subscription_renewal',
          relatedId: subscription.id,
        });
      }
    }
  }
}