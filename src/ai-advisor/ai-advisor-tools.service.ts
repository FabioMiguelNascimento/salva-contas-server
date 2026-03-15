import { Injectable, Scope } from '@nestjs/common';
import { AiVisualization, ToolEntry, ToolExecutionResult } from './ai-advisor.types';
import { CreateTransactionToolUseCase } from './use-cases/tools/create-transaction-tool.use-case';
import { GetExpensesByCategoryToolUseCase } from './use-cases/tools/get-expenses-by-category-tool.use-case';
import { GetMonthlySummaryToolUseCase } from './use-cases/tools/get-monthly-summary-tool.use-case';
import { GetSpendingTrendToolUseCase } from './use-cases/tools/get-spending-trend-tool.use-case';
import { GetTransactionDetailsToolUseCase } from './use-cases/tools/get-transaction-details-tool.use-case';
import { ProcessTransactionReceiptToolUseCase } from './use-cases/tools/process-transaction-receipt-tool.use-case';
import { AiAdvisorToolUseCase } from './use-cases/tools/tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class AiAdvisorToolsService {
  private readonly toolMap: Map<string, AiAdvisorToolUseCase>;

  constructor(
    private readonly getMonthlySummaryTool: GetMonthlySummaryToolUseCase,
    private readonly getExpensesByCategoryTool: GetExpensesByCategoryToolUseCase,
    private readonly getSpendingTrendTool: GetSpendingTrendToolUseCase,
    private readonly getTransactionDetailsTool: GetTransactionDetailsToolUseCase,
    private readonly processTransactionReceiptTool: ProcessTransactionReceiptToolUseCase,
    private readonly createTransactionTool: CreateTransactionToolUseCase,
  ) {
    const tools: AiAdvisorToolUseCase[] = [
      this.getMonthlySummaryTool,
      this.getExpensesByCategoryTool,
      this.getSpendingTrendTool,
      this.getTransactionDetailsTool,
      this.processTransactionReceiptTool,
      this.createTransactionTool,
    ];

    this.toolMap = new Map(tools.map((tool) => [tool.name, tool]));
  }

  buildTools(): any[] {
    const entries: ToolEntry[] = [
      {
        name: 'get_monthly_summary',
        description: 'Retorna totais de receita, despesa e saldo para um mes/ano.',
        parameters: {
          type: 'OBJECT',
          properties: {
            month: { type: 'NUMBER', description: 'Mes numerico de 1 a 12' },
            year: { type: 'NUMBER', description: 'Ano com 4 digitos' },
          },
          required: ['month', 'year'],
        },
      },
      {
        name: 'get_expenses_by_category',
        description: 'Retorna gastos agregados por categoria para um mes/ano para grafico de donut.',
        parameters: {
          type: 'OBJECT',
          properties: {
            month: { type: 'NUMBER', description: 'Mes numerico de 1 a 12' },
            year: { type: 'NUMBER', description: 'Ano com 4 digitos' },
          },
          required: ['month', 'year'],
        },
      },
      {
        name: 'get_spending_trend',
        description: 'Retorna serie temporal de gastos dos ultimos X dias para grafico de linha.',
        parameters: {
          type: 'OBJECT',
          properties: {
            days_back: { type: 'NUMBER', description: 'Quantidade de dias para tras' },
          },
          required: ['days_back'],
        },
      },
      {
        name: 'get_transaction_details',
        description: 'Retorna detalhes de uma transacao, incluindo o anexo se existir.',
        parameters: {
          type: 'OBJECT',
          properties: {
            transactionId: { type: 'STRING', description: 'ID da transacao' },
          },
          required: ['transactionId'],
        },
      },
      {
        name: 'process_transaction_receipt',
        description: 'Processa um comprovante (imagem) e retorna os dados de transacao extraidos.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fileIndex: { type: 'NUMBER', description: 'Indice do arquivo na lista de anexos' },
            paymentDate: { type: 'STRING', description: 'Data de pagamento (DD/MM/YYYY)', nullable: true },
            dueDate: { type: 'STRING', description: 'Data de vencimento (DD/MM/YYYY)', nullable: true },
            creditCardId: { type: 'STRING', description: 'ID do cartao de credito', nullable: true },
          },
          required: ['fileIndex'],
        },
      },
      {
        name: 'create_transaction',
        description: 'Registra uma transacao a partir de uma descricao em texto (sem anexo).',
        parameters: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING', description: 'Texto descrevendo a transacao' },
            paymentDate: { type: 'STRING', description: 'Data de pagamento (DD/MM/YYYY)', nullable: true },
            dueDate: { type: 'STRING', description: 'Data de vencimento (DD/MM/YYYY)', nullable: true },
            creditCardId: { type: 'STRING', description: 'ID do cartao de credito', nullable: true },
          },
          required: ['text'],
        },
      },
    ];

    return [{ functionDeclarations: entries }];
  }

  async processAttachmentsAndReturn(files: Express.Multer.File[]) {
    const visualizationsFromFiles: AiVisualization[] = [];
    const errors: string[] = [];

    for (const [index] of files.entries()) {
      try {
        const toolResult = await this.processTransactionReceiptTool.execute(
          { fileIndex: index },
          { files },
        );
        visualizationsFromFiles.push(toolResult.visualization);
      } catch (error: any) {
        const fileName = files[index]?.originalname || `arquivo-${index}`;
        errors.push(`${fileName}: ${error?.message ?? 'erro desconhecido'}`);
      }
    }

    const successful = visualizationsFromFiles.length;
    const failed = errors.length;
    const pieces: string[] = [];

    if (successful) pieces.push(`${successful} registrad${successful === 1 ? 'a' : 'as'}`);
    if (failed) pieces.push(`${failed} falhou${failed === 1 ? '' : 'am'}`);

    let message = `Processado${pieces.length ? `: ${pieces.join(', ')}` : ''}.`;
    if (errors.length) message += ` Erros: ${errors.join('; ')}`;

    return {
      message,
      toolCalls: ['process_transaction_receipt'],
      visualization: visualizationsFromFiles[0] ?? null,
      visualizations: visualizationsFromFiles,
    };
  }

  async executeTool(name: string, rawArgs: Record<string, any>, files?: Express.Multer.File[]): Promise<ToolExecutionResult> {
    const tool = this.toolMap.get(name);
    if (!tool) {
      return {
        responseForModel: { error: `Ferramenta nao suportada: ${name}` },
        visualization: {
          type: 'table_summary',
          toolName: name,
          title: 'Ferramenta nao suportada',
          payload: { error: `Ferramenta nao suportada: ${name}` },
        },
      };
    }

    return tool.execute(rawArgs, { files });
  }

  getMonthlySummary(month: number, year: number) {
    return this.getMonthlySummaryTool.getMonthlySummary(month, year);
  }
}
