import { Injectable } from '@nestjs/common';
import { Subscription } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionInput, GetAllSubscriptionsInput, UpdateSubscriptionInput } from 'src/schemas/subscriptions.schema';
import { SubscriptionsRepositoryInterface } from './subscriptions.interface';

@Injectable()
export default class SubscriptionsRepository extends SubscriptionsRepositoryInterface {
    private readonly DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

    constructor(private prisma: PrismaService) {
        super();
    }

    async createSubscription(data: CreateSubscriptionInput): Promise<any> {
        return this.prisma.subscription.create({
            data: {
                ...data,
                userId: this.DEV_USER_ID,
            },
            include: {
                category: true,
            }
        });
    }

    async getAllSubscriptions(filters?: GetAllSubscriptionsInput): Promise<any[]> {
        const where: any = {
            userId: this.DEV_USER_ID,
            isActive: true,
        };

        if (filters?.month && filters?.year) {
            where.createdAt = {
                gte: new Date(filters.year, filters.month - 1, 1),
                lt: new Date(filters.year, filters.month, 1),
            };
        } else if (filters?.year) {
            where.createdAt = {
                gte: new Date(filters.year, 0, 1),
                lt: new Date(filters.year + 1, 0, 1),
            };
        }

        return this.prisma.subscription.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: {
                createdAt: 'desc',
            }
        });
    }

    async createRecurringTransactions(): Promise<void> {
        const today = new Date();
        const dayOfMonth = today.getDate();
        const dayOfWeek = today.getDay();
        const month = today.getMonth() + 1; 

        const subscriptions = await this.prisma.subscription.findMany({
            where: {
                userId: this.DEV_USER_ID,
                isActive: true,
                OR: [
                    {
                        frequency: 'monthly',
                        dayOfMonth: dayOfMonth,
                    },
                    {
                        frequency: 'weekly',
                        dayOfWeek: dayOfWeek,
                    },
                    {
                        frequency: 'yearly',
                        dayOfMonth: dayOfMonth,
                        month: month,
                    },
                ],
            },
            include: {
                category: true,
            },
        });

        for (const sub of subscriptions) {
            await this.prisma.transaction.create({
                data: {
                    userId: this.DEV_USER_ID,
                    amount: sub.amount,
                    description: sub.description,
                    category: sub.category.name,
                    categoryName: sub.category.name,
                    categoryId: sub.categoryId,
                    type: 'expense',
                    status: 'pending', // ou 'paid' se débito automático
                    dueDate: today,
                },
            });
        }

        console.log(`Criadas ${subscriptions.length} transações recorrentes para hoje.`);
    }

    async updateSubscription(id: string, data: UpdateSubscriptionInput): Promise<Subscription> {
        const updateData: any = { ...data };

        if (data.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: data.categoryId },
            });
            if (!category) {
                throw new Error('Category not found');
            }
        }

        return this.prisma.subscription.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
            },
        });
    }

    async cancelSubscription(id: string): Promise<Subscription> {
        return this.prisma.subscription.update({
            where: { id },
            data: { isActive: false },
            include: {
                category: true,
            },
        });
    }
}