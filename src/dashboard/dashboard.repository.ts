import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from '../auth/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardRepositoryInterface } from './dashboard.interface';

@Injectable({ scope: Scope.REQUEST })
export class DashboardRepository extends DashboardRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {
    super();
  }

  private get userId(): string {
    return this.userContext.userId;
  }

  async getMetrics(month?: number, year?: number) {
    const whereClause: any = { userId: this.userId };
    if (month && year) {
      whereClause.createdAt = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else if (year) {
      whereClause.createdAt = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }

    const transactions = await this.prisma.transaction.findMany({
      where: whereClause,
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = new Map<string, { income: number; expenses: number }>();

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        totalIncome += amount;
      } else if (transaction.type === 'expense') {
        totalExpenses += amount;
      }

      const categoryName = transaction.category || 'Uncategorized';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, { income: 0, expenses: 0 });
      }
      const cat = categoryMap.get(categoryName)!;
      if (transaction.type === 'income') {
        cat.income += amount;
      } else if (transaction.type === 'expense') {
        cat.expenses += amount;
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, { income, expenses }]) => ({
      category,
      income,
      expenses,
      net: income - expenses,
    }));

    const pendingTransactions = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        status: 'pending',
      },
    });

    const now = new Date();
    let pendingCount = 0;
    let pendingTotalAmount = 0;
    let overdueCount = 0;

    for (const transaction of pendingTransactions) {
      const amount = Number(transaction.amount);
      pendingCount++;
      pendingTotalAmount += amount;

      if (transaction.dueDate && transaction.dueDate < now) {
        overdueCount++;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      categoryBreakdown,
      pendingBills: {
        count: pendingCount,
        totalAmount: pendingTotalAmount,
        overdue: overdueCount,
      },
    };
  }
}