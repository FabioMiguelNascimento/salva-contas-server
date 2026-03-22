import { Injectable, Scope } from '@nestjs/common';
import { ToolCreateTransactionArgsSchema } from 'src/schemas/ai-advisor.schema';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class CreateTransactionToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'create_transaction';

  constructor(
    private readonly processTransactionUseCase: ProcessTransactionUseCase,
  ) {}

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolCreateTransactionArgsSchema.parse(rawArgs);

    const transaction = await this.processTransactionUseCase.execute(
      null,
      args.text,
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
