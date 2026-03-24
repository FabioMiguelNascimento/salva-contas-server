import { Injectable, Scope } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  GetVaultHistoryInput,
  VaultAmountInput,
} from 'src/schemas/vaults.schema';

@Injectable({ scope: Scope.REQUEST })
export class VaultsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  getVaultById(id: string) {
    return this.prisma.vault.findFirst({ where: { id, userId: this.userId } });
  }

  getVaultByName(name: string) {
    return this.prisma.vault.findFirst({ where: { name, userId: this.userId } });
  }

  create(args: Prisma.VaultCreateArgs) {
    return this.prisma.vault.create(args);
  }

  update(args: Prisma.VaultUpdateArgs) {
    return this.prisma.vault.update(args);
  }

  delete(args: Prisma.VaultDeleteArgs) {
    return this.prisma.vault.delete(args);
  }

  private serializeCursor(event: { happenedAt: Date; id: string }) {
    return `${event.happenedAt.toISOString()}|${event.id}`;
  }

  private parseCursor(cursor?: string) {
    if (!cursor) return null;
    const [happenedAtRaw, id] = cursor.split('|');
    if (!happenedAtRaw || !id) {
      throw new Error('Cursor inválido');
    }

    const happenedAt = new Date(happenedAtRaw);
    if (Number.isNaN(happenedAt.getTime())) {
      throw new Error('Cursor inválido');
    }

    return { happenedAt, id };
  }

  async getHistory(id: string, query: GetVaultHistoryInput) {
    const now = new Date();
    const month = query.month ?? now.getUTCMonth() + 1;
    const year = query.year ?? now.getUTCFullYear();

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const cursor = this.parseCursor(query.cursor);

    const whereBase: Prisma.VaultHistoryEventWhereInput = {
      vaultId: id,
      userId: this.userId,
      happenedAt: {
        gte: startDate,
        lt: endDate,
      },
    };

    const whereCursor = cursor
      ? {
          AND: [
            whereBase,
            {
              OR: [
                { happenedAt: { lt: cursor.happenedAt } },
                {
                  happenedAt: cursor.happenedAt,
                  id: { lt: cursor.id },
                },
              ],
            },
          ],
        }
      : whereBase;

    const limit = query.limit ?? 20;

    const events = await this.prisma.vaultHistoryEvent.findMany({
      where: whereCursor,
      orderBy: [{ happenedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasNextPage = events.length > limit;
    const items = hasNextPage ? events.slice(0, limit) : events;

    const last = items[items.length - 1];

    const nextCursor = hasNextPage && last ? this.serializeCursor({ happenedAt: last.happenedAt, id: last.id }) : null;

    const totalEvents = await this.prisma.vaultHistoryEvent.count({ where: whereBase });

    const groupedAgg = await this.prisma.vaultHistoryEvent.groupBy({
      by: ['type'],
      where: whereBase,
      _sum: { amount: true },
    });

    const amountByType = groupedAgg.reduce(
      (acc, item) => {
        acc[item.type] = Number(item._sum.amount ?? 0);
        return acc;
      },
      {
        deposit: 0,
        withdraw: 0,
        yield: 0,
      } as Record<'deposit' | 'withdraw' | 'yield', number>,
    );

    const groups = items.reduce<Record<string, any[]>>((acc, event) => {
      const key = event.happenedAt.toISOString().slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      summary: {
        totalDeposited: amountByType.deposit,
        totalWithdrawn: amountByType.withdraw,
        totalYield: amountByType.yield,
        totalNetSaved: amountByType.deposit + amountByType.yield - amountByType.withdraw,
        totalEvents,
      },
      groups: Object.entries(groups).map(([date, items]) => ({ date, items })),
      pagination: {
        limit,
        nextCursor,
        hasNextPage,
      },
    };
  }

  private static readonly VAULT_CATEGORY_NAME = 'Cofrinho';

  private async getOrCreateVaultCategoryId(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const existing = await client.category.findFirst({
      where: {
        userId: this.userId,
        name: VaultsRepository.VAULT_CATEGORY_NAME,
      },
    });

    if (existing?.id) {
      return existing.id;
    }

    const created = await client.category.create({
      data: {
        userId: this.userId,
        name: VaultsRepository.VAULT_CATEGORY_NAME,
        icon: 'piggy-bank',
      },
      select: { id: true },
    });

    return created.id;
  }

  async deposit(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({ where: { id, userId: this.userId } });

      if (!vault) {
        throw new Error('Cofrinho não encontrado');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: { increment: input.amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.userContext.actorUserId,
          amount: input.amount,
          description: `${VaultsRepository.VAULT_CATEGORY_NAME} depósito: ${vault.name}`,
          category: VaultsRepository.VAULT_CATEGORY_NAME,
          categoryName: VaultsRepository.VAULT_CATEGORY_NAME,
          categoryId,
          type: 'expense',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      await tx.vaultHistoryEvent.create({
        data: {
          vaultId: vault.id,
          userId: this.userId,
          type: 'deposit',
          amount: input.amount,
          balanceAfter: updatedVault.currentAmount,
          happenedAt: new Date(),
        },
      });

      return updatedVault;
    });
  }

  async withdraw(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({ where: { id, userId: this.userId } });

      if (!vault) {
        throw new Error('Cofrinho não encontrado');
      }

      if (Number(vault.currentAmount) < input.amount) {
        throw new Error('Saldo insuficiente no cofrinho');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: { decrement: input.amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.userContext.actorUserId,
          amount: input.amount,
          description: `${VaultsRepository.VAULT_CATEGORY_NAME} saque: ${vault.name}`,
          category: VaultsRepository.VAULT_CATEGORY_NAME,
          categoryName: VaultsRepository.VAULT_CATEGORY_NAME,
          categoryId,
          type: 'income',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      await tx.vaultHistoryEvent.create({
        data: {
          vaultId: vault.id,
          userId: this.userId,
          type: 'withdraw',
          amount: input.amount,
          balanceAfter: updatedVault.currentAmount,
          happenedAt: new Date(),
        },
      });

      return updatedVault;
    });
  }

  async addYield(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({ where: { id, userId: this.userId } });

      if (!vault) {
        throw new Error('Cofrinho não encontrado');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: { increment: input.amount },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.userContext.actorUserId,
          amount: input.amount,
          description: `${VaultsRepository.VAULT_CATEGORY_NAME} rendimento: ${vault.name}`,
          category: VaultsRepository.VAULT_CATEGORY_NAME,
          categoryName: VaultsRepository.VAULT_CATEGORY_NAME,
          categoryId,
          type: 'income',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      await tx.vaultHistoryEvent.create({
        data: {
          vaultId: vault.id,
          userId: this.userId,
          type: 'yield',
          amount: input.amount,
          balanceAfter: updatedVault.currentAmount,
          happenedAt: new Date(),
        },
      });

      return updatedVault;
    });
  }
}
