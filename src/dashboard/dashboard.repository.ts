import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardRepositoryInterface } from './dashboard.interface';

@Injectable()
export class DashboardRepository extends DashboardRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {
    super()
  }

  async getMetrics(month?: number, year?: number) {
    const whereClause: any = {};
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

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      categoryBreakdown,
    };
  }
}