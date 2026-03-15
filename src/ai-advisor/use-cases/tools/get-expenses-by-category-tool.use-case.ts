import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ToolExpensesByCategoryArgsSchema } from 'src/schemas/ai-advisor.schema';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class GetExpensesByCategoryToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'get_expenses_by_category';

  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolExpensesByCategoryArgsSchema.parse(rawArgs);

    const startDate = new Date(args.year, args.month - 1, 1);
    const endDate = new Date(args.year, args.month, 1);

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryName'],
      where: { userId: this.userId, type: 'expense', createdAt: { gte: startDate, lt: endDate } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const data = {
      month: args.month,
      year: args.year,
      items: grouped.map((row) => ({
        category: row.categoryName || 'Sem categoria',
        total: Number(row._sum.amount || 0),
      })),
    };

    return {
      responseForModel: data,
      visualization: {
        type: 'chart_donut',
        toolName: this.name,
        title: `Despesas por categoria em ${args.month}/${args.year}`,
        payload: data,
      },
    };
  }
}
