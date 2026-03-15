import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ToolSpendingTrendArgsSchema } from 'src/schemas/ai-advisor.schema';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class GetSpendingTrendToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'get_spending_trend';

  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolSpendingTrendArgsSchema.parse(rawArgs);
    const daysBack = args.days_back;

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (daysBack - 1));
    startDate.setHours(0, 0, 0, 0);

    const expenses = await this.prisma.transaction.findMany({
      where: { userId: this.userId, type: 'expense', paymentDate: { gte: startDate } },
      select: { amount: true, paymentDate: true },
      orderBy: { paymentDate: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const tx of expenses) {
      const dateKey = (tx.paymentDate || today).toISOString().slice(0, 10);
      grouped.set(dateKey, (grouped.get(dateKey) || 0) + Number(tx.amount || 0));
    }

    const points: Array<{ date: string; total: number }> = [];
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      points.push({ date: key, total: Number((grouped.get(key) || 0).toFixed(2)) });
    }

    const data = { daysBack, points };

    return {
      responseForModel: data,
      visualization: {
        type: 'chart_line',
        toolName: this.name,
        title: `Tendencia de gastos (${daysBack} dias)`,
        payload: data,
      },
    };
  }
}
