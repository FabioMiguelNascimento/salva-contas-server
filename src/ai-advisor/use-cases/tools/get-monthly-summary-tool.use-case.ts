import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ToolMonthlySummaryArgsSchema } from 'src/schemas/ai-advisor.schema';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class GetMonthlySummaryToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'get_monthly_summary';

  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolMonthlySummaryArgsSchema.parse(rawArgs);
    const summary = await this.getMonthlySummary(args.month, args.year);

    return {
      responseForModel: summary,
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Resumo de ${args.month}/${args.year}`,
        payload: summary,
      },
    };
  }

  async getMonthlySummary(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId: this.userId, type: 'income', createdAt: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId: this.userId, type: 'expense', createdAt: { gte: startDate, lt: endDate } },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);

    return { month, year, totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }
}
