import { Inject, Injectable, Scope } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserContext } from 'src/auth/user-context.service';
import { PLAN_LIMITS } from 'src/config/plan-limits.config';


export interface SmartSearchInput {
  /** Query direta por ID. Se informado, ignora query text e amount. */
  transactionId?: string;
  query?: string;
  amount?: number;
  tolerance?: number;
  categoryId?: string;
  type?: 'expense' | 'income';
  status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
  limit?: number;
}

export interface SmartSearchResult {
  data: any[];
  total: number;
  strategy: 'id' | 'text' | 'amount' | 'fallback';
}

@Injectable({ scope: Scope.REQUEST })
export class TransactionSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  /**
   * Busca transação exata por ID, aplicando o mesmo userId e enrichment.
   */
  async findById(id: string): Promise<any | null> {
    const userId = this.userContext.userId;
    const include = this.txInclude();

    const tx = await this.prisma.transaction.findFirst({
      where: { userId, id },
      include,
    });

    if (!tx) return null;

    const enriched = await this.enrichWithNames([tx]);
    return enriched[0];
  }

  /**
   * Busca transações com estratégia progressiva e segura:
   *  1. transactionId → by-id lookup
   *  2. query text → description ILIKE (via Prisma contains)
   *  3. amount → range scan gte/lte no campo Decimal amount
   *  4. fallback → retorna as mais recentes por limite/histórico do plano
   *
   */
  async smartSearch(
    input: SmartSearchInput,
  ): Promise<SmartSearchResult> {
    const include = this.txInclude();
    const orderBy = [
      { paymentDate: 'desc' as const },
      { dueDate: 'desc' as const },
      { createdAt: 'desc' as const },
    ];

    // 1️⃣ Busca por ID
    if (input.transactionId) {
      const tx = await this.findById(input.transactionId);
      if (tx) {
        return { data: [tx], total: 1, strategy: 'id' };
      }
    }

    const userId = this.userContext.userId;
    const historyLimit = await this.getHistoryLimitDate();

    const buildWhere = (extra?: Record<string, any>) => {
      const where: any = { userId, ...(extra ?? {}) };
      if (historyLimit) {
        where.createdAt = { gte: historyLimit };
      }
      return where;
    };

    const limit = input.limit ?? 10;
    const tolerance = input.tolerance ?? 0.02;

    const applyFilters = (where: any) => {
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;
      if (input.categoryId) where.categoryId = input.categoryId;
      return where;
    };

    const queryTrim = input.query?.trim();
    if (queryTrim) {
      const where = applyFilters(buildWhere({
        description: { contains: queryTrim, mode: 'insensitive' },
      }));

      const data = await this.prisma.transaction.findMany({
        where, include, orderBy, take: limit,
      });
      if (data.length > 0) {
        return { data: await this.enrichWithNames(data), total: data.length, strategy: 'text' };
      }
    }

    if (input.amount !== undefined) {
      const lo = input.amount - tolerance;
      const hi = input.amount + tolerance;
      const where = applyFilters(buildWhere({
        amount: { gte: lo, lte: hi },
      }));

      const data = await this.prisma.transaction.findMany({
        where, include, orderBy, take: limit,
      });
      if (data.length > 0) {
        return { data: await this.enrichWithNames(data), total: data.length, strategy: 'amount' };
      }
    }

    {
      const where = applyFilters(buildWhere({}));

      const data = await this.prisma.transaction.findMany({
        where, include, orderBy, take: limit,
      });
      if (data.length > 0) {
        return { data: await this.enrichWithNames(data), total: data.length, strategy: 'fallback' };
      }
    }

    return { data: [], total: 0, strategy: 'text' };
  }


  private txInclude() {
    return {
      categoryRel: true,
      creditCard: true,
      debitCard: true,
      splits: { include: { creditCard: true, debitCard: true } },
    };
  }

  private async getHistoryLimitDate(): Promise<Date | null> {
    const user = await this.userContext.localUser;
    if (!user) return null;
    const limits = PLAN_LIMITS[user.planTier];
    if (Number.isFinite(limits.historyMonths) && limits.historyMonths > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() - limits.historyMonths);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return null;
  }

  /**
   * Adiciona `categoryName` e `createdByName` ao resultado para consumo
   * pela IA e pelas visualizações frontend.
   */
  private async enrichWithNames(txns: any[]): Promise<any[]> {
    if (txns.length === 0) return txns;

    const createdByIds = [...new Set(txns.map((t) => t.createdById).filter(Boolean))];
    const users = createdByIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: createdByIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const usersMap = new Map(users.map((u) => [u.id, u]));

    return txns.map((tx) => {
      const categoryName = tx.categoryRel?.name ?? 'Sem categoria';
      const creator = tx.createdById ? usersMap.get(tx.createdById) : null;
      return {
        ...tx,
        categoryName,
        createdByName: creator?.name ?? creator?.email ?? null,
      };
    });
  }
}
