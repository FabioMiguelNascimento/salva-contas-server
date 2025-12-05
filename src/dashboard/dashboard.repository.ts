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
    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const currentPeriodStart = new Date(currentYear, currentMonth - 1, 1);
    const currentPeriodEnd = new Date(currentYear, currentMonth, 1);

    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previousPeriodStart = new Date(previousYear, previousMonth - 1, 1);
    const previousPeriodEnd = new Date(previousYear, previousMonth, 1);

    const currentTransactions = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        createdAt: {
          gte: currentPeriodStart,
          lt: currentPeriodEnd,
        },
      },
    });

    const previousTransactions = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        createdAt: {
          gte: previousPeriodStart,
          lt: previousPeriodEnd,
        },
      },
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryMap = new Map<string, { income: number; expenses: number }>();

    for (const transaction of currentTransactions) {
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

    let previousIncome = 0;
    let previousExpenses = 0;

    for (const transaction of previousTransactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        previousIncome += amount;
      } else if (transaction.type === 'expense') {
        previousExpenses += amount;
      }
    }

    const calculateChangePercent = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const expensesChangePercent = calculateChangePercent(totalExpenses, previousExpenses);
    const incomeChangePercent = calculateChangePercent(totalIncome, previousIncome);
    const balanceChangePercent = calculateChangePercent(
      totalIncome - totalExpenses,
      previousIncome - previousExpenses,
    );

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
      incomeChangePercent,
      expensesChangePercent,
      balanceChangePercent,
      previousMonth: {
        income: previousIncome,
        expenses: previousExpenses,
        balance: previousIncome - previousExpenses,
      },
      categoryBreakdown,
      pendingBills: {
        count: pendingCount,
        totalAmount: pendingTotalAmount,
        overdue: overdueCount,
      },
    };
  }
}