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

  private parseDateOnlyInput(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  async getMetrics(
    month?: number,
    year?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    if (startDate && endDate) {
      currentPeriodStart = new Date(startDate);
      currentPeriodStart.setHours(0, 0, 0, 0);

      currentPeriodEnd = new Date(endDate);
      currentPeriodEnd.setHours(0, 0, 0, 0);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 1);

      const periodDurationMs =
        currentPeriodEnd.getTime() - currentPeriodStart.getTime();
      previousPeriodStart = new Date(
        currentPeriodStart.getTime() - periodDurationMs,
      );
      previousPeriodEnd = new Date(
        currentPeriodEnd.getTime() - periodDurationMs,
      );
    } else {
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();

      currentPeriodStart = new Date(currentYear, currentMonth - 1, 1);
      currentPeriodEnd = new Date(currentYear, currentMonth, 1);

      const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      previousPeriodStart = new Date(previousYear, previousMonth - 1, 1);
      previousPeriodEnd = new Date(previousYear, previousMonth, 1);
    }

    const currentTransactions = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        OR: [
          {
            paymentDate: {
              gte: currentPeriodStart,
              lt: currentPeriodEnd,
            },
          },
          {
            paymentDate: null,
            createdAt: {
              gte: currentPeriodStart,
              lt: currentPeriodEnd,
            },
          },
        ],
      },
    });

    const previousTransactions = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        OR: [
          {
            paymentDate: {
              gte: previousPeriodStart,
              lt: previousPeriodEnd,
            },
          },
          {
            paymentDate: null,
            createdAt: {
              gte: previousPeriodStart,
              lt: previousPeriodEnd,
            },
          },
        ],
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

    const calculateChangePercent = (
      current: number,
      previous: number,
    ): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0;
      }
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const expensesChangePercent = calculateChangePercent(
      totalExpenses,
      previousExpenses,
    );
    const incomeChangePercent = calculateChangePercent(
      totalIncome,
      previousIncome,
    );
    const balanceChangePercent = calculateChangePercent(
      totalIncome - totalExpenses,
      previousIncome - previousExpenses,
    );

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, { income, expenses }]) => ({
        category,
        income,
        expenses,
        net: income - expenses,
      }),
    );

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

    const savedAmountAgg = await this.prisma.vault.aggregate({
      where: { userId: this.userId },
      _sum: { currentAmount: true },
    });

    const manualYieldAmount = currentTransactions.reduce((sum, transaction) => {
      if (
        transaction.vaultId &&
        transaction.type === 'income' &&
        transaction.description.startsWith('Rendimento manual no cofrinho:')
      ) {
        return sum + Number(transaction.amount);
      }

      return sum;
    }, 0);

    const savedAmount = Number(savedAmountAgg._sum.currentAmount || 0);
    const availableBalance = totalIncome - totalExpenses - manualYieldAmount;

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      availableBalance,
      savedAmount,
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
    startDate?: string;
    endDate?: string;
    status?: 'paid' | 'pending';
    type?: 'expense' | 'income';
    categoryId?: string;
  }) {
    const month = filters?.month;
    const year = filters?.year;
    const rangeStartInput = filters?.startDate;
    const rangeEndInput = filters?.endDate;

    const rangeStart = rangeStartInput
      ? this.parseDateOnlyInput(rangeStartInput)
      : null;
    const rangeEnd = rangeEndInput
      ? this.parseDateOnlyInput(rangeEndInput)
      : null;

    if (rangeStart) {
      rangeStart.setHours(0, 0, 0, 0);
    }

    if (rangeEnd) {
      rangeEnd.setHours(0, 0, 0, 0);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    }

    const resolvedMonth =
      month ||
      (rangeEndInput
        ? this.parseDateOnlyInput(rangeEndInput).getMonth() + 1
        : new Date().getMonth() + 1);
    const resolvedYear =
      year ||
      (rangeEndInput
        ? this.parseDateOnlyInput(rangeEndInput).getFullYear()
        : new Date().getFullYear());
    const monthStart = new Date(resolvedYear, resolvedMonth - 1, 1);
    const nextMonthStart = new Date(resolvedYear, resolvedMonth, 1);

    const periodStart = rangeStart ?? (month && year ? monthStart : null);
    const periodEnd = rangeEnd ?? (month && year ? nextMonthStart : null);

    const transactionWhere: any = {
      AND: [{ userId: this.userId }],
    };

    if (filters?.type) {
      transactionWhere.AND.push({ type: filters.type });
    }

    if (filters?.status) {
      transactionWhere.AND.push({ status: filters.status });
    }

    if (periodStart && periodEnd) {
      transactionWhere.AND.push({
        OR: [
          {
            paymentDate: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
          {
            paymentDate: null,
            dueDate: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
          {
            paymentDate: null,
            dueDate: null,
            createdAt: {
              gte: periodStart,
              lt: periodEnd,
            },
          },
        ],
      });
    }

    if (filters?.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: filters.categoryId },
      });
      if (category) {
        if (category.isGlobal) {
          transactionWhere.AND.push({
            OR: [
              { categoryId: filters.categoryId },
              { categoryName: category.name },
            ],
          });
        } else {
          transactionWhere.AND.push({ categoryId: filters.categoryId });
        }
      }
    }

    const metricsPromise = this.getMetrics(
      month,
      year,
      rangeStartInput ? this.parseDateOnlyInput(rangeStartInput) : undefined,
      rangeEndInput ? this.parseDateOnlyInput(rangeEndInput) : undefined,
    );

    const transactionsPromise = this.prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true } },
      },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
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

    const debitCardsPromise = this.prisma.debitCard.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const vaultsPromise = this.prisma.vault.findMany({
      where: {
        userId: this.userId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const [
      metrics,
      transactionsRaw,
      subscriptions,
      budgets,
      categories,
      creditCardsRaw,
      debitCards,
      vaults,
    ] = await Promise.all([
      metricsPromise,
      transactionsPromise,
      subscriptionsPromise,
      budgetsPromise,
      categoriesPromise,
      creditCardsRawPromise,
      debitCardsPromise,
      vaultsPromise,
    ]);

    const createdByIds = [
      ...new Set(
        transactionsRaw
          .map((transaction) => transaction.createdById)
          .filter(Boolean) as string[],
      ),
    ];

    const users =
      createdByIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: createdByIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const usersMap = new Map(users.map((user) => [user.id, user]));

    const transactions = await Promise.all(
      transactionsRaw.map(async (transaction) => {
        const attachmentUrl = transaction.attachmentKey
          ? await this.storageService.getPresignedUrl(transaction.attachmentKey)
          : null;

        return {
          ...transaction,
          createdByName: transaction.createdById
            ? usersMap.get(transaction.createdById)?.name ||
              usersMap.get(transaction.createdById)?.email ||
              null
            : null,
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
        const rawPercentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        const percentage = Math.min(100, Math.max(0, rawPercentage));

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

        const debt =
          Number(txAgg._sum.amount || 0) + Number(splitAgg._sum.amount || 0);

        return {
          id: card.id,
          userId: card.userId,
          createdById: card.createdById,
          name: card.name,
          flag: card.flag,
          lastFourDigits: card.lastFourDigits,
          limit: Number(card.limit),
          availableLimit: Number(card.limit) - debt,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          status: card.status,
          createdAt: card.createdAt ?? null,
          updatedAt: card.updatedAt ?? null,
        } as any;
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
      debitCards,
      vaults,
    };
  }
}
