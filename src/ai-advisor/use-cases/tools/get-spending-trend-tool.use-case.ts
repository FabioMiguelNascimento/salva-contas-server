import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ToolSpendingTrendArgsSchema } from 'src/schemas/ai-advisor.schema';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class GetSpendingTrendToolUseCase extends BaseAiTool<
  typeof ToolSpendingTrendArgsSchema
> {
  readonly name = 'get_spending_trend';
  readonly description =
    'Retorna serie temporal de gastos dos ultimos X dias para grafico de linha.';
  readonly schema = ToolSpendingTrendArgsSchema;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolSpendingTrendArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const daysBack = args.days_back || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId: this.userContext.userId,
        type: 'expense',
        OR: [
          { paymentDate: { gte: startDate } },
          { paymentDate: null, createdAt: { gte: startDate } },
        ],
      },
      select: {
        amount: true,
        paymentDate: true,
        createdAt: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const dailySpend: Record<string, number> = {};

    // Initialize dates
    for (let i = 0; i <= daysBack; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailySpend[dateStr] = 0;
    }

    for (const tx of transactions) {
      const date = tx.paymentDate || tx.createdAt;
      const dateStr = date.toISOString().split('T')[0];
      if (dailySpend[dateStr] !== undefined) {
        dailySpend[dateStr] += Number(tx.amount);
      }
    }

    const data = Object.entries(dailySpend).map(([date, amount]) => ({
      date,
      amount,
    }));

    return {
      responseForModel: { trend: data },
      visualization: {
        type: 'chart_line',
        toolName: this.name,
        title: `Tendência de Gastos (Últimos ${daysBack} dias)`,
        payload: { items: data },
      },
    };
  }
}
