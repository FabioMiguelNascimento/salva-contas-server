import { Budget } from 'generated/prisma/client';

export interface BudgetMetrics {
  totalBudgeted: number;
  totalSpent: number;
  remaining: number;
  percentage: number;
}

export interface BudgetHistoryEntry {
  id: string;
  budgetId: string;
  categoryId: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  spentPercentage: number;
  month: number;
  year: number;
  message: string;
  createdAt: Date;
}

export abstract class BudgetsRepositoryInterface {
  abstract createBudget(data: {
    categoryId: string;
    amount: number;
    month: number;
    year: number;
  }): Promise<Budget>;
  abstract getBudgets(month?: number, year?: number): Promise<Budget[]>;
  abstract updateBudget(id: string, data: { amount?: number }): Promise<Budget>;
  abstract deleteBudget(id: string): Promise<void>;
  abstract getBudgetProgress(
    month: number,
    year: number,
  ): Promise<
    Array<{
      budget: Budget;
      spent: number;
      remaining: number;
      percentage: number;
    }>
  >;
  abstract getMetrics(month: number, year: number): Promise<BudgetMetrics>;
  abstract getBudgetHistory(id: string, limit?: number): Promise<BudgetHistoryEntry[]>;
}
