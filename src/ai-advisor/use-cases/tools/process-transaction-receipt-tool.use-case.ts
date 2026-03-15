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

    return {
      responseForModel: transaction,
      visualization: {
        type: 'transaction',
        toolName: this.name,
        title: `Transacao extraida de ${file.originalname}`,
        payload: transaction,
      },
    };
  }
}
