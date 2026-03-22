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
    const query = (args.transactionId ?? args.query ?? '').trim();

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query,
      );

    if (isUuid) {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id: query },
        select: {
          id: true,
          userId: true,
          description: true,
          amount: true,
          type: true,
          status: true,
          categoryId: true,
          categoryName: true,
          dueDate: true,
          paymentDate: true,
          attachmentKey: true,
          attachmentOriginalName: true,
          attachmentMimeType: true,
        },
      });

      let categoryIcon: string | null = null;
      if (transaction?.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: transaction.categoryId },
          select: { icon: true },
        });
        categoryIcon = category?.icon ?? null;
      }

      let detail: Record<string, any>;
      if (!transaction || transaction.userId !== this.userId) {
        detail = { error: 'Transacao nao encontrada ou acesso negado' };
      } else {
        let attachmentUrl: string | null = null;
        if (transaction.attachmentKey) {
          try {
            attachmentUrl = await this.storageService.getPresignedUrl(
              transaction.attachmentKey,
            );
          } catch {
            attachmentUrl = null;
          }
        }

        detail = { ...transaction, attachmentUrl, categoryIcon };
      }

      return {
        responseForModel: detail,
        visualization: {
          type: 'transaction',
          toolName: this.name,
          title: `Detalhes da transacao ${args.transactionId}`,
          payload: detail,
        },
      };
    }

    const matches = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        description: { contains: query, mode: 'insensitive' },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const items = matches.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount),
      category: tx.categoryName ?? 'Sem categoria',
      status: tx.status,
      createdAt: tx.createdAt,
      paymentDate: tx.paymentDate,
      dueDate: tx.dueDate,
    }));

    return {
      responseForModel: { query, items },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Transacoes encontradas para "${query}" (${items.length})`,
        payload: { items, totalTransactions: items.length },
      },
    };
  }
}
