import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class FinancialBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableBalance(userId: string): Promise<number> {
    const [incomeAgg, expenseAgg, manualYieldAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          vaultId: { not: null },
          type: 'income',
          description: {
            startsWith: 'Rendimento manual no cofrinho:',
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);
    const manualYieldAmount = Number(manualYieldAgg._sum.amount || 0);

    return totalIncome - totalExpenses - manualYieldAmount;
  }
}
