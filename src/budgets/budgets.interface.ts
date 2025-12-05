import { Budget } from 'generated/prisma/client';

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
  abstract getBudgetProgress(month: number, year: number): Promise<Array<{
    budget: Budget;
    spent: number;
    remaining: number;
    percentage: number;
  }>>;
}