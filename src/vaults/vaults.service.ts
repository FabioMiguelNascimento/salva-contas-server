import {
    BadRequestException,
    Injectable,
    NotFoundException,
    Scope,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    CreateVaultInput,
    GetVaultHistoryInput,
    UpdateVaultInput,
    VaultAmountInput,
} from 'src/schemas/vaults.schema';
import { UserContext } from '../auth/user-context.service';

const VAULT_CATEGORY_NAME = 'Cofrinho';
const DEPOSIT_PREFIX = 'Depósito no cofrinho:';
const WITHDRAW_PREFIX = 'Resgate do cofrinho:';
const YIELD_PREFIX = 'Rendimento manual no cofrinho:';

type VaultHistoryEventType = 'deposit' | 'withdraw' | 'yield';

interface HistoryCursor {
  happenedAt: Date;
  id: string;
}

@Injectable({ scope: Scope.REQUEST })
export class VaultsService {
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

  private async getVaultOrThrow(id: string) {
    const vault = await this.prisma.vault.findFirst({
      where: {
        id,
        userId: this.userId,
      },
    });

    if (!vault) {
      throw new NotFoundException('Cofrinho não encontrado');
    }

    return vault;
  }

  private async getOrCreateVaultCategoryId(tx: Prisma.TransactionClient) {
    const existing = await tx.category.findFirst({
      where: {
        userId: this.userId,
        name: VAULT_CATEGORY_NAME,
      },
      select: { id: true },
    });

    if (existing?.id) {
      return existing.id;
    }

    const created = await tx.category.create({
      data: {
        userId: this.userId,
        name: VAULT_CATEGORY_NAME,
        icon: 'piggy-bank',
      },
      select: { id: true },
    });

    return created.id;
  }

  private serializeCursor(cursor: HistoryCursor): string {
    return `${cursor.happenedAt.toISOString()}|${cursor.id}`;
  }

  private parseCursor(cursor?: string): HistoryCursor | null {
    if (!cursor) {
      return null;
    }

    const [happenedAtRaw, id] = cursor.split('|');

    if (!happenedAtRaw || !id) {
      throw new BadRequestException('Cursor inválido');
    }

    const happenedAt = new Date(happenedAtRaw);

    if (Number.isNaN(happenedAt.getTime())) {
      throw new BadRequestException('Cursor inválido');
    }

    return { happenedAt, id };
  }

  private getMonthRange(month?: number, year?: number) {
    const now = new Date();
    const resolvedMonth = month ?? now.getUTCMonth() + 1;
    const resolvedYear = year ?? now.getUTCFullYear();

    const startDate = new Date(Date.UTC(resolvedYear, resolvedMonth - 1, 1));
    const endDate = new Date(Date.UTC(resolvedYear, resolvedMonth, 1));

    return {
      month: resolvedMonth,
      year: resolvedYear,
      startDate,
      endDate,
    };
  }

  private async recordHistoryEvent(
    tx: Prisma.TransactionClient,
    params: {
      vaultId: string;
      type: VaultHistoryEventType;
      amount: number;
      balanceAfter: Prisma.Decimal;
      happenedAt: Date;
    },
  ) {
    await tx.vaultHistoryEvent.create({
      data: {
        vaultId: params.vaultId,
        userId: this.userId,
        type: params.type,
        amount: params.amount,
        balanceAfter: params.balanceAfter,
        happenedAt: params.happenedAt,
      },
    });
  }

  async findAll() {
    return this.prisma.vault.findMany({
      where: {
        userId: this.userId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async create(data: CreateVaultInput) {
    return this.prisma.vault.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
        userId: this.userId,
      },
    });
  }

  async getHistory(id: string, query: GetVaultHistoryInput) {
    await this.getVaultOrThrow(id);

    const { month, year, startDate, endDate } = this.getMonthRange(
      query.month,
      query.year,
    );
    const cursor = this.parseCursor(query.cursor);
    const whereBase: Prisma.VaultHistoryEventWhereInput = {
      vaultId: id,
      userId: this.userId,
      happenedAt: {
        gte: startDate,
        lt: endDate,
      },
    };

    const whereWithCursor: Prisma.VaultHistoryEventWhereInput = cursor
      ? {
          ...whereBase,
          OR: [
            { happenedAt: { lt: cursor.happenedAt } },
            {
              happenedAt: cursor.happenedAt,
              id: { lt: cursor.id },
            },
          ],
        }
      : whereBase;

    const [eventsRaw, totalEvents, groupedAgg] = await Promise.all([
      this.prisma.vaultHistoryEvent.findMany({
        where: whereWithCursor,
        orderBy: [{ happenedAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      }),
      this.prisma.vaultHistoryEvent.count({ where: whereBase }),
      this.prisma.vaultHistoryEvent.groupBy({
        by: ['type'],
        where: whereBase,
        _sum: { amount: true },
      }),
    ]);

    const hasNextPage = eventsRaw.length > query.limit;
    const events = hasNextPage ? eventsRaw.slice(0, query.limit) : eventsRaw;
    const last = events[events.length - 1];
    const nextCursor = hasNextPage && last
      ? this.serializeCursor({ happenedAt: last.happenedAt, id: last.id })
      : null;

    const groupedByDate = events.reduce<Record<string, typeof events>>(
      (acc, event) => {
        const key = event.happenedAt.toISOString().slice(0, 10);
        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key].push(event);
        return acc;
      },
      {},
    );

    const amountByType = groupedAgg.reduce<Record<VaultHistoryEventType, number>>(
      (acc, item) => {
        acc[item.type as VaultHistoryEventType] = Number(item._sum.amount ?? 0);
        return acc;
      },
      { deposit: 0, withdraw: 0, yield: 0 },
    );

    return {
      month: `${year}-${String(month).padStart(2, '0')}`,
      summary: {
        totalDeposited: amountByType.deposit,
        totalWithdrawn: amountByType.withdraw,
        totalYield: amountByType.yield,
        totalNetSaved:
          amountByType.deposit + amountByType.yield - amountByType.withdraw,
        totalEvents,
      },
      groups: Object.entries(groupedByDate).map(([date, items]) => ({
        date,
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          amount: Number(item.amount),
          balanceAfter: Number(item.balanceAfter),
          happenedAt: item.happenedAt,
        })),
      })),
      pagination: {
        limit: query.limit,
        nextCursor,
        hasNextPage,
      },
    };
  }

  async update(id: string, data: UpdateVaultInput) {
    await this.getVaultOrThrow(id);

    return this.prisma.vault.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.targetAmount !== undefined
          ? { targetAmount: data.targetAmount }
          : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
      },
    });
  }

  async remove(id: string) {
    const vault = await this.getVaultOrThrow(id);

    if (Number(vault.currentAmount) > 0) {
      throw new BadRequestException(
        'Não é possível excluir um cofrinho com saldo maior que zero',
      );
    }

    await this.prisma.vault.delete({
      where: { id },
    });
  }

  async deposit(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({
        where: {
          id,
          userId: this.userId,
        },
      });

      if (!vault) {
        throw new NotFoundException('Cofrinho não encontrado');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: {
            increment: input.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.actorUserId,
          amount: input.amount,
          description: `${DEPOSIT_PREFIX} ${vault.name}`,
          category: VAULT_CATEGORY_NAME,
          categoryName: VAULT_CATEGORY_NAME,
          categoryId,
          type: 'expense',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      await this.recordHistoryEvent(tx, {
        vaultId: vault.id,
        type: 'deposit',
        amount: input.amount,
        balanceAfter: updatedVault.currentAmount,
        happenedAt: new Date(),
      });

      return updatedVault;
    });
  }

  async withdraw(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({
        where: {
          id,
          userId: this.userId,
        },
      });

      if (!vault) {
        throw new NotFoundException('Cofrinho não encontrado');
      }

      if (Number(vault.currentAmount) < input.amount) {
        throw new BadRequestException('Saldo insuficiente no cofrinho');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: {
            decrement: input.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.actorUserId,
          amount: input.amount,
          description: `${WITHDRAW_PREFIX} ${vault.name}`,
          category: VAULT_CATEGORY_NAME,
          categoryName: VAULT_CATEGORY_NAME,
          categoryId,
          type: 'income',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      await this.recordHistoryEvent(tx, {
        vaultId: vault.id,
        type: 'withdraw',
        amount: input.amount,
        balanceAfter: updatedVault.currentAmount,
        happenedAt: new Date(),
      });

      return updatedVault;
    });
  }

  async addYield(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({
        where: {
          id,
          userId: this.userId,
        },
      });

      if (!vault) {
        throw new NotFoundException('Cofrinho não encontrado');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: {
            increment: input.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.actorUserId,
          amount: input.amount,
          description: `${YIELD_PREFIX} ${vault.name}`,
          category: VAULT_CATEGORY_NAME,
          categoryName: VAULT_CATEGORY_NAME,
          categoryId,
          type: 'income',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      await this.recordHistoryEvent(tx, {
        vaultId: vault.id,
        type: 'yield',
        amount: input.amount,
        balanceAfter: updatedVault.currentAmount,
        happenedAt: new Date(),
      });

      return updatedVault;
    });
  }
}
