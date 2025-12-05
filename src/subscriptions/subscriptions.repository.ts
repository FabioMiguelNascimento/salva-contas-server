import { Injectable, Scope } from '@nestjs/common';
import { Subscription } from 'generated/prisma/client';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionInput, GetAllSubscriptionsInput, UpdateSubscriptionInput } from 'src/schemas/subscriptions.schema';
import { SubscriptionsRepositoryInterface } from './subscriptions.interface';

@Injectable({ scope: Scope.REQUEST })
export default class SubscriptionsRepository extends SubscriptionsRepositoryInterface {
    constructor(
        private prisma: PrismaService,
        private userContext: UserContext,
    ) {
        super();
    }

    private get userId(): string {
        return this.userContext.userId;
    }

    async createSubscription(data: CreateSubscriptionInput): Promise<any> {
        const { creditCardId, ...restData } = data;
        
        const createData: any = {
            ...restData,
            userId: this.userId,
        };

        if (creditCardId) {
            createData.creditCard = { connect: { id: creditCardId } };
        }

        return this.prisma.subscription.create({
            data: createData,
            include: {
                category: true,
                creditCard: true,
            }
        });
    }

    async getAllSubscriptions(filters?: GetAllSubscriptionsInput): Promise<any[]> {
        const where: any = {
            userId: this.userId,
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
                creditCard: true,
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
                userId: this.userId,
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
                creditCard: true,
            },
        });

        for (const sub of subscriptions) {
            const transactionData: any = {
                userId: this.userId,
                amount: sub.amount,
                description: sub.description,
                category: sub.category.name,
                categoryName: sub.category.name,
                categoryId: sub.categoryId,
                type: 'expense',
                status: 'pending', // ou 'paid' se débito automático
                dueDate: today,
            };

            // Se a assinatura tem cartão de crédito, vincular à transação
            if (sub.creditCardId) {
                transactionData.creditCardId = sub.creditCardId;
            }

            await this.prisma.transaction.create({
                data: transactionData,
            });
        }

        console.log(`Criadas ${subscriptions.length} transações recorrentes para hoje.`);
    }

    async updateSubscription(id: string, data: UpdateSubscriptionInput): Promise<Subscription> {
        const { creditCardId, ...restData } = data;
        const updateData: any = { ...restData };

        if (data.categoryId) {
            const category = await this.prisma.category.findUnique({
                where: { id: data.categoryId },
            });
            if (!category) {
                throw new Error('Category not found');
            }
        }

        // Tratar creditCardId: conectar, desconectar ou manter
        if (creditCardId === null) {
            updateData.creditCard = { disconnect: true };
        } else if (creditCardId) {
            updateData.creditCard = { connect: { id: creditCardId } };
        }

        return this.prisma.subscription.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
                creditCard: true,
            },
        });
    }

    async cancelSubscription(id: string): Promise<Subscription> {
        return this.prisma.subscription.update({
            where: { id },
            data: { isActive: false },
            include: {
                category: true,
                creditCard: true,
            },
        });
    }
}
