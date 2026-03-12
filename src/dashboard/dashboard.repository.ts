import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from '../auth/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DashboardRepositoryInterface } from './dashboard.interface';

@Injectable({ scope: Scope.REQUEST })
export class DashboardRepository extends DashboardRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
    private readonly storageService: StorageService,
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

      if (transaction.type === 'expense') {
        const categoryName = transaction.category || 'Uncategorized';
        if (!categoryMap.has(categoryName)) {
          categoryMap.set(categoryName, { income: 0, expenses: 0 });
        }
        categoryMap.get(categoryName)!.expenses += amount;
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

    if (categoryBreakdown.length > 0) {
      const categoryNames = categoryBreakdown.map((c) => c.category);
      const matchedCategories = await this.prisma.category.findMany({
        where: {
          userId: this.userId,
          name: { in: categoryNames },
        },
        select: { id: true, name: true },
      });

      const nameToId = new Map(matchedCategories.map((c) => [c.name, c.id]));

      for (const item of categoryBreakdown) {
        (item as any).categoryId = nameToId.get(item.category) ?? null;
      }
    }

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

  async getSnapshot(filters?: {
    month?: number;
    year?: number;
    status?: 'paid' | 'pending';
    type?: 'expense' | 'income';
    categoryId?: string;
  }) {
    const month = filters?.month;
    const year = filters?.year;

    const resolvedMonth = month || new Date().getMonth() + 1;
    const resolvedYear = year || new Date().getFullYear();
    const monthStart = new Date(resolvedYear, resolvedMonth - 1, 1);
    const nextMonthStart = new Date(resolvedYear, resolvedMonth, 1);

    const transactionWhere: any = {
      userId: this.userId,
    };

    if (filters?.type) transactionWhere.type = filters.type;
    if (filters?.status) transactionWhere.status = filters.status;

    if (month && year) {
      transactionWhere.createdAt = {
        gte: monthStart,
        lt: nextMonthStart,
      };
    }

    if (filters?.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: filters.categoryId } });
      if (category) {
        if (category.isGlobal) {
          transactionWhere.OR = [
            { categoryId: filters.categoryId },
            { categoryName: category.name },
          ];
        } else {
          transactionWhere.categoryId = filters.categoryId;
        }
      }
    }

    const metricsPromise = this.getMetrics(month, year);

    const transactionsPromise = this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        categoryRel: true,
        creditCard: true,
        splits: { include: { creditCard: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const subscriptionsPromise = this.prisma.subscription.findMany({
      where: {
        userId: this.userId,
        isActive: true,
      },
      include: {
        category: true,
        creditCard: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const budgetsPromise = this.prisma.budget.findMany({
      where: {
        userId: this.userId,
        month: resolvedMonth,
        year: resolvedYear,
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    const categoriesPromise = this.prisma.category.findMany({
      where: {
        OR: [{ userId: this.userId }, { isGlobal: true }],
      },
      orderBy: { name: 'asc' },
    });

    const creditCardsRawPromise = this.prisma.creditCard.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const [metrics, transactionsRaw, subscriptions, budgets, categories, creditCardsRaw] = await Promise.all([
      metricsPromise,
      transactionsPromise,
      subscriptionsPromise,
      budgetsPromise,
      categoriesPromise,
      creditCardsRawPromise,
    ]);

    const transactions = await Promise.all(
      transactionsRaw.map(async (transaction) => {
        const attachmentUrl = transaction.attachmentKey
          ? await this.storageService.getPresignedUrl(transaction.attachmentKey)
          : null;

        return {
          ...transaction,
          attachmentUrl,
        };
      }),
    );

    const budgetProgress = await Promise.all(
      budgets.map(async (budget) => {
        const spentResult = await this.prisma.transaction.aggregate({
          where: {
            userId: this.userId,
            categoryId: budget.categoryId,
            type: 'expense',
            createdAt: {
              gte: monthStart,
              lt: nextMonthStart,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const spent = Number(spentResult._sum?.amount || 0);
        const budgetAmount = Number(budget.amount);
        const remaining = budgetAmount - spent;
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

        return {
          budget,
          spent,
          remaining,
          percentage,
        };
      }),
    );

    const creditCards = await Promise.all(
      creditCardsRaw.map(async (card) => {
        const txAgg = await this.prisma.transaction.aggregate({
          where: {
            userId: this.userId,
            creditCardId: card.id,
            type: 'expense',
            splits: { none: {} },
          },
          _sum: { amount: true },
        });

        const splitAgg = await this.prisma.transactionSplit.aggregate({
          where: {
            creditCardId: card.id,
            transaction: {
              userId: this.userId,
              type: 'expense',
            },
          },
          _sum: { amount: true },
        });

        const debt = Number(txAgg._sum.amount || 0) + Number(splitAgg._sum.amount || 0);

        return {
          ...card,
          availableLimit: Number(card.limit) - debt,
        };
      }),
    );

    return {
      metrics,
      transactions,
      subscriptions,
      budgets,
      budgetProgress,
      categories,
      creditCards,
    };
  }
}