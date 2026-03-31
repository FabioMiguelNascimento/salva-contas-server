import { Inject, Injectable, Scope } from '@nestjs/common';
import { DashboardRepositoryInterface } from 'src/dashboard/dashboard.interface';
import { ToolMonthlySummaryArgsSchema } from 'src/schemas/ai-advisor.schema';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class GetMonthlySummaryToolUseCase extends BaseAiTool<
  typeof ToolMonthlySummaryArgsSchema
> {
  readonly name = 'get_monthly_summary';
  readonly description =
    'Retorna totais de receita, despesa e saldo para um mes/ano.';
  readonly schema = ToolMonthlySummaryArgsSchema;

  constructor(
    @Inject(DashboardRepositoryInterface)
    private readonly dashboardRepository: DashboardRepositoryInterface,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolMonthlySummaryArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const data = await this.dashboardRepository.getMetrics(
      args.month,
      args.year,
    );

    return {
      responseForModel: {
        success: true,
        message: `O resumo financeiro de ${args.month}/${args.year} foi gerado com sucesso.`,
        data: {
          receitas: data.totalIncome,
          despesas: data.totalExpenses,
          saldo: data.netBalance,
        },
        instructionToAi:
          'Diga ao usuário que o resumo foi gerado e está aparecendo na tela. Faça um comentário breve e amigável sobre o fato das despesas estarem maiores que as receitas.',
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Resumo de ${args.month}/${args.year}`,
        payload: data,
      },
    };
  }

  getMonthlySummary(month: number, year: number) {
    return this.dashboardRepository.getMetrics(month, year);
  }
}
