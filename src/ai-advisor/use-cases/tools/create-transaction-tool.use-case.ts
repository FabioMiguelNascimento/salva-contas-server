import { Injectable, Scope } from '@nestjs/common';
import { ToolCreateTransactionArgsSchema } from 'src/schemas/ai-advisor.schema';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class CreateTransactionToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'create_transaction';

  constructor(private readonly processTransactionUseCase: ProcessTransactionUseCase) {}

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolCreateTransactionArgsSchema.parse(rawArgs);

    const transaction = await this.processTransactionUseCase.execute(null, args.text, {
      creditCardId: args.creditCardId ?? undefined,
      paymentDate: args.paymentDate ?? undefined,
      dueDate: args.dueDate ?? undefined,
    });

    const transactions = Array.isArray(transaction) ? transaction : [transaction];
    if (transactions.length > 1) {
      return {
        responseForModel: {
          totalTransactions: transactions.length,
          transactions,
        },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: `${transactions.length} transacoes criadas`,
          payload: {
            totalTransactions: transactions.length,
            items: transactions.map((tx: any) => ({
              description: tx.description,
              amount: Number(tx.amount || 0),
              category: tx.categoryName || tx.category || 'Sem categoria',
            })),
          },
        },
      };
    }

    const singleTransaction = transactions[0];

    return {
      responseForModel: singleTransaction,
      visualization: {
        type: 'transaction',
        toolName: this.name,
        title: `Transacao criada: ${singleTransaction.description}`,
        payload: singleTransaction,
      },
    };
  }
}
