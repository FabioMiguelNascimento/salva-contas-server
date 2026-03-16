import { Injectable, Scope } from '@nestjs/common';
import { ToolProcessReceiptArgsSchema } from 'src/schemas/ai-advisor.schema';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase, ToolExecutionContext } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class ProcessTransactionReceiptToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'process_transaction_receipt';

  constructor(private readonly processTransactionUseCase: ProcessTransactionUseCase) {}

  async execute(rawArgs: Record<string, any>, context?: ToolExecutionContext): Promise<ToolExecutionResult> {
    const args = ToolProcessReceiptArgsSchema.parse(rawArgs);
    const file = context?.files?.[args.fileIndex];

    if (!file) {
      throw new Error(`Arquivo nao encontrado no indice ${args.fileIndex}.`);
    }

    const transaction = await this.processTransactionUseCase.execute(file, null, {
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
          title: `${transactions.length} transacoes extraidas de ${file.originalname}`,
          payload: {
            totalTransactions: transactions.length,
            items: transactions.map((tx: any) => ({
              description: tx.description,
              amount: Number(tx.amount || 0),
              category: tx.categoryName || tx.category || 'Sem categoria',
              createdByName: tx.createdByName || null,
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
        title: `Transacao extraida de ${file.originalname}`,
        payload: singleTransaction,
      },
    };
  }
}
