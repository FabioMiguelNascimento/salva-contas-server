import { Injectable, Scope } from '@nestjs/common';
import { ToolExecutionResult } from 'src/ai-advisor/ai-advisor.types';
import { ToolProcessReceiptArgsSchema } from 'src/schemas/ai-advisor.schema';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';
import { z } from 'zod';
import { BaseAiTool } from '../../tools/base-ai-tool';
import { ToolExecutionContext } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class ProcessTransactionReceiptToolUseCase extends BaseAiTool<
  typeof ToolProcessReceiptArgsSchema
> {
  readonly name = 'process_transaction_receipt';
  readonly description =
    'Processa um comprovante (imagem) e retorna os dados de transacao extraidos.';
  readonly schema = ToolProcessReceiptArgsSchema;

  constructor(
    private readonly processTransactionUseCase: ProcessTransactionUseCase,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolProcessReceiptArgsSchema>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const file = context?.files?.[args.fileIndex];

    if (!file) {
      throw new Error(`Anexo de índice ${args.fileIndex} não encontrado.`);
    }

    const transaction = await this.processTransactionUseCase.execute(
      file,
      null,
      {
        creditCardId: args.creditCardId ?? undefined,
        paymentDate: args.paymentDate ?? undefined,
        dueDate: args.dueDate ?? undefined,
      },
      true,
    );

    const transactions = Array.isArray(transaction)
      ? transaction
      : [transaction];

    return {
      responseForModel: {
        totalTransactions: transactions.length,
        transactions,
        requiresConfirmation: true,
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `${transactions.length} transações extraídas`,
        payload: {
          requiresConfirmation: true,
          proposedTransactions: transactions,
          totalTransactions: transactions.length,
          items: transactions.map((tx: any) => ({
            description: tx.description,
            amount: Number(tx.amount || 0),
            category: tx.categoryName || tx.category || 'Sem categoria',
            createdAt: tx.createdAt,
            paymentDate: tx.paymentDate,
            dueDate: tx.dueDate,
          })),
        },
      },
    };
  }
}
