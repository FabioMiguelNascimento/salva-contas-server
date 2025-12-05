import { Injectable, Scope } from '@nestjs/common';
import { Budget } from 'generated/prisma/client';
import { UserContext } from '../auth/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetsRepositoryInterface } from './budgets.interface';

@Injectable({ scope: Scope.REQUEST })
export class BudgetsRepository implements BudgetsRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async createBudget(data: {
    categoryId: string;
    amount: number;
    month: number;
    year: number;
  }): Promise<Budget> {
    return this.prisma.budget.create({
      data: {
        ...data,
        userId: this.userId,
      },
      include: {
        category: true,
      },
    });
  }

  async getBudgets(month?: number, year?: number): Promise<Budget[]> {
    const where: any = { userId: this.userId };

    if (month && year) {
      where.month = month;
      where.year = year;
    } else if (year) {
      where.year = year;
    }

    return this.prisma.budget.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateBudget(id: string, data: { amount?: number }): Promise<Budget> {
    return this.prisma.budget.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });
  }

  async deleteBudget(id: string): Promise<void> {
    await this.prisma.budget.delete({
      where: { id },
    });
  }

  async getBudgetProgress(month: number, year: number): Promise<Array<{
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
  }>> {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId: this.userId,
        month,
        year,
      },
      include: {
        category: true,
      },
    });

    const results = await Promise.all(
      budgets.map(async (budget) => {
        // Calculate spent amount for this category in the month/year
        const spentResult = await this.prisma.transaction.aggregate({
          where: {
            userId: this.userId,
            category: budget.category.name,
            type: 'expense',
            createdAt: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 1),
            },
          },
          _sum: {
            amount: true,
          },
        });

        const spent = Number(spentResult._sum.amount || 0);
        const budgetAmount = Number(budget.amount);
        const remaining = budgetAmount - spent;
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

        return {
          budget,
          spent,
          remaining,
          percentage,
        };
      })
    );

    return results;
  }
}