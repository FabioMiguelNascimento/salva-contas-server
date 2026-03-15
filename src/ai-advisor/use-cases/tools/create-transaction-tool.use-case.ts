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

    return {
      responseForModel: transaction,
      visualization: {
        type: 'transaction',
        toolName: this.name,
        title: `Transacao criada: ${transaction.description}`,
        payload: transaction,
      },
    };
  }
}
