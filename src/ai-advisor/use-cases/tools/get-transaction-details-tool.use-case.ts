import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ToolTransactionDetailsArgsSchema } from 'src/schemas/ai-advisor.schema';
import { StorageService } from 'src/storage/storage.service';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class GetTransactionDetailsToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'get_transaction_details';

  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
    private readonly storageService: StorageService,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolTransactionDetailsArgsSchema.parse(rawArgs);

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: args.transactionId },
      select: {
        id: true,
        userId: true,
        description: true,
        amount: true,
        type: true,
        status: true,
        categoryName: true,
        dueDate: true,
        paymentDate: true,
        attachmentKey: true,
        attachmentOriginalName: true,
        attachmentMimeType: true,
      },
    });

    let detail: Record<string, any>;
    if (!transaction || transaction.userId !== this.userId) {
      detail = { error: 'Transacao nao encontrada ou acesso negado' };
    } else {
      let attachmentUrl: string | null = null;
      if (transaction.attachmentKey) {
        try {
          attachmentUrl = await this.storageService.getPresignedUrl(transaction.attachmentKey);
        } catch {
          attachmentUrl = null;
        }
      }

      detail = { ...transaction, attachmentUrl };
    }

    return {
      responseForModel: detail,
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Detalhes da transacao ${args.transactionId}`,
        payload: detail,
      },
    };
  }
}
