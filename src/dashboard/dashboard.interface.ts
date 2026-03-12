
export abstract class DashboardRepositoryInterface {
  abstract getMetrics(month?: number, year?: number): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    categoryBreakdown: Array<{
      category: string;
      categoryId?: string | null;
      income: number;
      expenses: number;
      net: number;
    }>;
    pendingBills: {
      count: number;
      totalAmount: number;
      overdue: number;
    };
  }>;

  abstract getSnapshot(filters?: {
    month?: number;
    year?: number;
    status?: 'paid' | 'pending';
    type?: 'expense' | 'income';
    categoryId?: string;
  }): Promise<{
    metrics: {
      totalIncome: number;
      totalExpenses: number;
      netBalance: number;
      incomeChangePercent: number;
      expensesChangePercent: number;
      balanceChangePercent: number;
      previousMonth: {
        income: number;
        expenses: number;
        balance: number;
      };
      categoryBreakdown: Array<{
        category: string;
        categoryId?: string | null;
        income: number;
        expenses: number;
        net: number;
      }>;
      pendingBills: {
        count: number;
        totalAmount: number;
        overdue: number;
      };
    };
    transactions: any[];
    subscriptions: any[];
    budgets: any[];
    budgetProgress: Array<{
      budget: any;
      spent: number;
      remaining: number;
      percentage: number;
    }>;
    categories: any[];
    creditCards: any[];
  }>;
}