import { Inject, Injectable, Scope } from '@nestjs/common';
import { z } from 'zod';
import { ToolExpensesByCategoryArgsSchema } from 'src/schemas/ai-advisor.schema';
import { DashboardRepositoryInterface } from 'src/dashboard/dashboard.interface';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class GetExpensesByCategoryToolUseCase extends BaseAiTool<
  typeof ToolExpensesByCategoryArgsSchema
> {
  readonly name = 'get_expenses_by_category';
  readonly description =
    'Retorna gastos agregados por categoria para um mes/ano para grafico de donut.';
  readonly schema = ToolExpensesByCategoryArgsSchema;

  constructor(
    @Inject(DashboardRepositoryInterface)
    private readonly dashboardRepository: DashboardRepositoryInterface,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolExpensesByCategoryArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const metrics = await this.dashboardRepository.getMetrics(
      args.month,
      args.year,
    );
    const data = metrics.categoryBreakdown;

    return {
      responseForModel: { categories: data },
      visualization: {
        type: 'chart_donut',
        toolName: this.name,
        title: `Gastos por Categoria (${args.month}/${args.year})`,
        payload: { items: data },
      },
    };
  }
}
