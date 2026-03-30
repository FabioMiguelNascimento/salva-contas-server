import { Injectable, Scope } from '@nestjs/common';
import { DebitCard } from '../../generated/prisma/client';
import { UserContext } from '../auth/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDebitCardInput,
  GetDebitCardsInput,
  UpdateDebitCardInput,
} from '../schemas/debit-cards.schema';
import {
  DebitCardMetrics,
  DebitCardsRepositoryInterface,
} from './debit-cards.interface';

@Injectable({ scope: Scope.REQUEST })
export class DebitCardsRepository implements DebitCardsRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  private get actorUserId(): string {
    return this.userContext.actorUserId;
  }

  async getMetrics(): Promise<DebitCardMetrics> {
    const cards = await this.prisma.debitCard.findMany({
      where: {
        userId: this.userId,
        status: 'active',
      },
    });

    // Como o modelo DebitCard não possui campo `balance`, computamos o montante
    // com base nos gastos via transações e splits para cada cartão.
    const amountByCard = await Promise.all(
      cards.map(async (card) => {
        const txAgg = await this.prisma.transaction.aggregate({
          where: {
            userId: this.userId,
            debitCardId: card.id,
            type: 'expense',
            splits: { none: {} },
          },
          _sum: { amount: true },
        });

        const splitAgg = await this.prisma.transactionSplit.aggregate({
          where: {
            debitCardId: card.id,
            transaction: { userId: this.userId, type: 'expense' },
          },
          _sum: { amount: true },
        });

        return (
          Number(txAgg._sum.amount || 0) + Number(splitAgg._sum.amount || 0)
        );
      }),
    );

    const totalBalance = amountByCard.reduce((sum, value) => sum + value, 0);

    return {
      totalBalance,
      activeCardsCount: cards.length,
    };
  }

  async createDebitCard(data: CreateDebitCardInput): Promise<DebitCard> {
    return this.prisma.debitCard.create({
      data: {
        ...data,
        userId: this.userId,
        createdById: this.actorUserId,
      },
    });
  }

  async getDebitCards(filters?: GetDebitCardsInput): Promise<DebitCard[]> {
    const where: any = { userId: this.userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.debitCard.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: filters ? (filters.page - 1) * filters.limit : 0,
      take: filters?.limit,
    });
  }

  async getDebitCardById(id: string): Promise<DebitCard | null> {
    return this.prisma.debitCard.findFirst({
      where: {
        id,
        userId: this.userId,
      },
    });
  }

  async updateDebitCard(
    id: string,
    data: UpdateDebitCardInput,
  ): Promise<DebitCard> {
    const existing = await this.prisma.debitCard.findFirst({
      where: { id, userId: this.userId },
    });
    if (!existing) {
      const notFoundError: any = new Error('Debit card not found');
      notFoundError.code = 'P2025';
      throw notFoundError;
    }

    return this.prisma.debitCard.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteDebitCard(id: string): Promise<void> {
    const existing = await this.prisma.debitCard.findFirst({
      where: { id, userId: this.userId },
    });
    if (!existing) {
      const notFoundError: any = new Error('Debit card not found');
      notFoundError.code = 'P2025';
      throw notFoundError;
    }

    await this.prisma.debitCard.delete({
      where: {
        id,
      },
    });
  }
}
