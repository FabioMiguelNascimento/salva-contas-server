import { Injectable, Scope } from '@nestjs/common';
import { ToolProcessReceiptArgsSchema } from 'src/schemas/ai-advisor.schema';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';
import { ToolExecutionResult } from '../../ai-advisor.types';
import {
  AiAdvisorToolUseCase,
  ToolExecutionContext,
} from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class ProcessTransactionReceiptToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'process_transaction_receipt';

  constructor(
    private readonly processTransactionUseCase: ProcessTransactionUseCase,
  ) {}

  async execute(
    rawArgs: Record<string, any>,
    context?: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const files = context?.files ?? [];

    if (!files.length) {
      return {
        responseForModel: {
          error: 'Nenhum anexo foi enviado.',
          hint: 'Anexe um comprovante e tente novamente para eu extrair a transacao automaticamente.',
        },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: 'Comprovante necessario',
          payload: {
            items: [],
            totalTransactions: 0,
            error: 'Nenhum anexo foi enviado.',
            hint: 'Anexe um comprovante e tente novamente para eu extrair a transacao automaticamente.',
          },
        },
      };
    }

    const fileIndexCandidate = Number(rawArgs?.fileIndex);
    const normalizedArgs = {
      ...rawArgs,
      fileIndex:
        Number.isInteger(fileIndexCandidate) && fileIndexCandidate >= 0
          ? fileIndexCandidate
          : 0,
    };

    const args = ToolProcessReceiptArgsSchema.parse(normalizedArgs);
    const file = context?.files?.[args.fileIndex];

    if (!file) {
      return {
        responseForModel: {
          error: `Arquivo nao encontrado no indice ${args.fileIndex}.`,
          hint: `Foram enviados ${files.length} anexo(s).`,
        },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: 'Indice de anexo invalido',
          payload: {
            items: [],
            totalTransactions: 0,
            error: `Arquivo nao encontrado no indice ${args.fileIndex}.`,
            hint: `Foram enviados ${files.length} anexo(s).`,
          },
        },
      };
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
          title: `${transactions.length} transacoes extraidas de ${file.originalname}`,
          payload: {
            requiresConfirmation: true,
            proposedTransactions: transactions,
            totalTransactions: transactions.length,
            items: transactions.map((tx: any) => ({
              description: tx.description,
              amount: Number(tx.amount || 0),
              category: tx.categoryName || tx.category || 'Sem categoria',
              createdByName: tx.createdByName || null,
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
        title: `Transacao extraida de ${file.originalname}`,
        payload: {
          ...singleTransaction,
          requiresConfirmation: true,
        },
      },
    };
  }
}
