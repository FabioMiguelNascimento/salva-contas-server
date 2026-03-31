import { Injectable, Scope } from '@nestjs/common';
import { AiVisualization } from './ai-advisor.types';
import { ProcessTransactionReceiptToolUseCase } from './use-cases/tools/process-transaction-receipt-tool.use-case';

import { ToolRegistry } from './tools/tool-registry.service';

@Injectable({ scope: Scope.REQUEST })
export class AiAdvisorToolsService {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly processTransactionReceiptTool: ProcessTransactionReceiptToolUseCase,
  ) {}

  buildTools(): any[] {
    return [{ functionDeclarations: this.registry.getToolDefinitions() }];
  }

  async processAttachmentsAndReturn(files: Express.Multer.File[]) {
    const visualizationsFromFiles: AiVisualization[] = [];
    const errors: string[] = [];
    let totalRegisteredTransactions = 0;

    for (const [index] of files.entries()) {
      try {
        const toolResult = await this.processTransactionReceiptTool.run(
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

  getMonthlySummary(month: number, year: number) {
    return (
      this.registry.getTool('get_monthly_summary') as any
    )?.getMonthlySummary(month, year);
  }
}
