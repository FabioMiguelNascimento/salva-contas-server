import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export default class SubscriptionSchedulerService {
    constructor(private readonly prisma: PrismaService) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRecurringSubscriptions() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayOfMonth = today.getDate();
        const dayOfWeek = today.getDay();
        const month = today.getMonth() + 1;

        const subscriptions = await this.prisma.subscription.findMany({
            where: {
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
            const transactionData: any = {
                userId: sub.userId,
                createdById: sub.userId,
                amount: sub.amount,
                description: sub.description,
                category: sub.category.name,
                categoryName: sub.category.name,
                categoryRel: { connect: { id: sub.categoryId } },
                type: 'expense',
                status: 'pending',
                dueDate: today,
            };

            if (sub.creditCardId) {
                transactionData.creditCard = { connect: { id: sub.creditCardId } };
            }

            await this.prisma.transaction.create({
                data: transactionData,
            });
        }

        console.log(`Criadas ${subscriptions.length} transações recorrentes para hoje.`);
    }
}