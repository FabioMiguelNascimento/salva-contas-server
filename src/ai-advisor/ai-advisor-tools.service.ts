import { Injectable, Scope } from '@nestjs/common';
import {
  AiVisualization,
  ToolEntry,
  ToolExecutionResult,
} from './ai-advisor.types';
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
        description:
          'Retorna totais de receita, despesa e saldo para um mes/ano.',
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
        description:
          'Retorna gastos agregados por categoria para um mes/ano para grafico de donut.',
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
        description:
          'Retorna serie temporal de gastos dos ultimos X dias para grafico de linha.',
        parameters: {
          type: 'OBJECT',
          properties: {
            days_back: {
              type: 'NUMBER',
              description: 'Quantidade de dias para tras',
            },
          },
          required: ['days_back'],
        },
      },
      {
        name: 'get_transaction_details',
        description:
          'Retorna detalhes de uma transacao, incluindo o anexo se existir. Aceita ID ou texto.',
        parameters: {
          type: 'OBJECT',
          properties: {
            transactionId: { type: 'STRING', description: 'ID da transacao' },
            query: {
              type: 'STRING',
              description: 'Texto livre para buscar transacoes por descricao',
            },
          },
        },
      },
      {
        name: 'process_transaction_receipt',
        description:
          'Processa um comprovante (imagem) e retorna os dados de transacao extraidos.',
        parameters: {
          type: 'OBJECT',
          properties: {
            fileIndex: {
              type: 'NUMBER',
              description: 'Indice do arquivo na lista de anexos',
            },
            paymentDate: {
              type: 'STRING',
              description: 'Data de pagamento (DD/MM/YYYY)',
              nullable: true,
            },
            dueDate: {
              type: 'STRING',
              description: 'Data de vencimento (DD/MM/YYYY)',
              nullable: true,
            },
            creditCardId: {
              type: 'STRING',
              description: 'ID do cartao de credito',
              nullable: true,
            },
          },
          required: ['fileIndex'],
        },
      },
      {
        name: 'create_transaction',
        description:
          'Registra uma transacao a partir de uma descricao em texto (sem anexo).',
        parameters: {
          type: 'OBJECT',
          properties: {
            text: {
              type: 'STRING',
              description: 'Texto descrevendo a transacao',
            },
            paymentDate: {
              type: 'STRING',
              description: 'Data de pagamento (DD/MM/YYYY)',
              nullable: true,
            },
            dueDate: {
              type: 'STRING',
              description: 'Data de vencimento (DD/MM/YYYY)',
              nullable: true,
            },
            creditCardId: {
              type: 'STRING',
              description: 'ID do cartao de credito',
              nullable: true,
            },
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
    let totalRegisteredTransactions = 0;

    for (const [index] of files.entries()) {
      try {
        const toolResult = await this.processTransactionReceiptTool.execute(
          { fileIndex: index },
          { files },
        );
        visualizationsFromFiles.push(toolResult.visualization);

        if (
          toolResult.visualization.type === 'table_summary' &&
          toolResult.visualization.toolName === 'process_transaction_receipt'
        ) {
          const qty = Number(
            (toolResult.visualization.payload as any)?.totalTransactions || 0,
          );
          totalRegisteredTransactions += qty > 0 ? qty : 1;
        } else {
          totalRegisteredTransactions += 1;
        }
      } catch (error: any) {
        const fileName = files[index]?.originalname || `arquivo-${index}`;
        errors.push(`${fileName}: ${error?.message ?? 'erro desconhecido'}`);
      }
    }

    const successfulFiles = visualizationsFromFiles.length;
    const failed = errors.length;
    const pieces: string[] = [];

    if (totalRegisteredTransactions) {
      pieces.push(
        `${totalRegisteredTransactions} transa${totalRegisteredTransactions === 1 ? 'cao registrada' : 'coes registradas'}`,
      );
    }
    if (successfulFiles) {
      pieces.push(
        `${successfulFiles} arquivo${successfulFiles === 1 ? '' : 's'} processado${successfulFiles === 1 ? '' : 's'}`,
      );
    }
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

  async executeTool(
    name: string,
    rawArgs: Record<string, any>,
    files?: Express.Multer.File[],
  ): Promise<ToolExecutionResult> {
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

    const safeArgs = this.normalizeArgsForTool(name, rawArgs);

    try {
      return tool.execute(safeArgs, { files });
    } catch (error: any) {
      const message =
        this.getToolFallbackMessage(name, error?.message) ??
        'Nao consegui executar esta acao agora. Tente novamente.';

      return {
        responseForModel: { error: message },
        visualization: {
          type: 'table_summary',
          toolName: name,
          title: 'Ajuste necessario',
          payload: {
            items: [],
            totalTransactions: 0,
            error: message,
          },
        },
      };
    }
  }

  getMonthlySummary(month: number, year: number) {
    return this.getMonthlySummaryTool.getMonthlySummary(month, year);
  }

  private normalizeArgsForTool(name: string, rawArgs: Record<string, any>) {
    const sanitizedArgs = this.sanitizeArgs(rawArgs);

    switch (name) {
      case 'get_monthly_summary':
      case 'get_expenses_by_category':
        return {
          ...sanitizedArgs,
          month: this.toIntegerOrUndefined(sanitizedArgs.month),
          year: this.toIntegerOrUndefined(sanitizedArgs.year),
        };
      case 'get_spending_trend':
        return {
          ...sanitizedArgs,
          days_back: this.toIntegerOrUndefined(sanitizedArgs.days_back),
        };
      case 'process_transaction_receipt':
        return {
          ...sanitizedArgs,
          fileIndex: this.toIntegerOrUndefined(sanitizedArgs.fileIndex),
        };
      default:
        return sanitizedArgs;
    }
  }

  private sanitizeArgs(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return this.sanitizeValue(value) as Record<string, any>;
  }

  private sanitizeValue(value: unknown): unknown {
    if (value == null) return value;

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      const lowered = value.trim().toLowerCase();
      if (
        lowered === 'nan' ||
        lowered === 'infinity' ||
        lowered === '-infinity'
      ) {
        return undefined;
      }
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeValue(item))
        .filter((item) => item !== undefined);
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, this.sanitizeValue(item)] as const)
        .filter(([, item]) => item !== undefined);

      return Object.fromEntries(entries);
    }

    return value;
  }

  private toIntegerOrUndefined(value: unknown) {
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isInteger(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private getToolFallbackMessage(name: string, originalMessage?: string) {
    if (name === 'process_transaction_receipt') {
      return 'Para processar comprovante, anexe uma imagem e tente novamente.';
    }

    if (name === 'get_transaction_details') {
      return 'Para buscar transacao, informe um ID valido ou uma descricao para pesquisa.';
    }

    return originalMessage;
  }
}
