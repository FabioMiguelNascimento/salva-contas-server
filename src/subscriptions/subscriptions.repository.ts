import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionInput } from 'src/schemas/subscriptions.schema';
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

    async getAllSubscriptions(): Promise<any[]> {
        return this.prisma.subscription.findMany({
            where: {
                userId: this.DEV_USER_ID,
                isActive: true,
            },
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
}