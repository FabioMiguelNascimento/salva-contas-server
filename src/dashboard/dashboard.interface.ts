
export abstract class DashboardRepositoryInterface {
  abstract getMetrics(month?: number, year?: number): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    categoryBreakdown: Array<{
      category: string;
      income: number;
      expenses: number;
      net: number;
    }>;
  }>;
}