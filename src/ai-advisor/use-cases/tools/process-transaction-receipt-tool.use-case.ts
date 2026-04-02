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
    'Processa um comprovante (imagem/pdf). SÓ USE ESTA FERRAMENTA se a mensagem atual avisar "[SISTEMA]: O usuário anexou...". NUNCA use para buscar detalhes do histórico.';
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
      throw new Error(
        "Nenhum arquivo anexado nesta requisição. PARE de usar 'process_transaction_receipt'. Se precisar buscar detalhes de uma transação já registrada, use a ferramenta 'get_transaction_details'.",
      );
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
