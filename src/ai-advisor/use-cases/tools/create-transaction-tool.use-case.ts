import { Injectable, Scope } from '@nestjs/common';
import { ToolCreateTransactionArgsSchema } from 'src/schemas/ai-advisor.schema';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class CreateTransactionToolUseCase extends BaseAiTool<
  typeof ToolCreateTransactionArgsSchema
> {
  readonly name = 'create_transaction';
  readonly description =
    'Registra uma transação a partir de uma descrição em texto.';
  readonly schema = ToolCreateTransactionArgsSchema;

  constructor(
    private readonly processTransactionUseCase: ProcessTransactionUseCase,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolCreateTransactionArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const transaction = await this.processTransactionUseCase.execute(
      null,
      args.description,
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

    if (transactions.length > 1) {
      return {
        responseForModel: {
          totalTransactions: transactions.length,
          transactions,
          requiresConfirmation: true,
        },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: `${transactions.length} transacoes pré-registradas`,
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

    const singleTransaction = transactions[0];

    return {
      responseForModel: {
        transaction: singleTransaction,
        requiresConfirmation: true,
      },
      visualization: {
        type: 'transaction',
        toolName: this.name,
        title: `Transacao pré-registrada: ${singleTransaction.description}`,
        payload: {
          ...singleTransaction,
          requiresConfirmation: true,
        },
      },
    };
  }
}
