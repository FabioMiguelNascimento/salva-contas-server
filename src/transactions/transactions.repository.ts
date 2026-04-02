import { Injectable, Scope } from '@nestjs/common';
import { addMonths } from 'date-fns';
import { UserContext } from 'src/auth/user-context.service';
import { PLAN_LIMITS } from 'src/config/plan-limits.config';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    AIReceiptData,
    GetTransactionsInput,
    SplitInput,
    UpdateTransactionInput,
} from 'src/schemas/transactions.schema';
import { parseDateLocal } from 'src/utils/date-utils';
import {
    CreateTransactionOptions,
    TransactionsRepositoryInterface,
    TransactionWithCount,
} from './transactions.interface';

const CARD_RECALC_CONCURRENCY = 4;

@Injectable({ scope: Scope.REQUEST })
export default class TransactionsRepository extends TransactionsRepositoryInterface {
  private readonly createdByNameCache = new Map<string, string | null>();
  private readonly categoryIdCache = new Map<string, string | null>();

  constructor(
    private prisma: PrismaService,
    private userContext: UserContext,
  ) {
    super();
  }

  private get userId(): string {
    return this.userContext.userId;
  }

  private get actorUserId(): string {
    return this.userContext.actorUserId;
  }

  private async recalcCardLimit(cardId: string) {
    const card = await this.prisma.creditCard.findUnique({
      where: { id: cardId },
    });
    if (!card) return;

    const txAgg = await this.prisma.transaction.aggregate({
      where: {
        userId: this.userId,
        creditCardId: cardId,
        type: 'expense',
        splits: { none: {} },
      },
      _sum: { amount: true },
    });

    const splitAgg = await this.prisma.transactionSplit.aggregate({
      where: {
        creditCardId: cardId,
        transaction: {
          userId: this.userId,
          type: 'expense',
        },
      },
      _sum: { amount: true },
    });

    const debt =
      Number(txAgg._sum.amount || 0) + Number(splitAgg._sum.amount || 0);
    const newAvailable = Number(card.limit) - debt;
    await this.prisma.creditCard.update({
      where: { id: cardId },
      data: { availableLimit: newAvailable },
    });
  }

  async recalcCardLimits(cardIds: string[]): Promise<void> {
    const uniqueCardIds = [...new Set(cardIds.filter(Boolean))];
    if (uniqueCardIds.length === 0) {
      return;
    }

    for (let i = 0; i < uniqueCardIds.length; i += CARD_RECALC_CONCURRENCY) {
      const batch = uniqueCardIds.slice(i, i + CARD_RECALC_CONCURRENCY);
      await Promise.all(batch.map((cardId) => this.recalcCardLimit(cardId)));
    }
  }

  private async resolveCategoryId(
    normalizedCategory: string,
  ): Promise<string | null> {
    if (this.categoryIdCache.has(normalizedCategory)) {
      return this.categoryIdCache.get(normalizedCategory) ?? null;
    }

    const categoryToConnect = await this.prisma.category.findFirst({
      where: {
        name: normalizedCategory,
        OR: [{ userId: this.userId }, { isGlobal: true }],
      },
      orderBy: { userId: 'desc' },
      select: { id: true },
    });

    const categoryId = categoryToConnect?.id ?? null;
    this.categoryIdCache.set(normalizedCategory, categoryId);
    return categoryId;
  }

  private async createSplits(transactionId: string, splits: SplitInput[]) {
    await this.prisma.transactionSplit.createMany({
      data: splits.map((s) => ({
        transactionId,
        amount: s.amount,
        paymentMethod: s.paymentMethod,
        creditCardId: s.creditCardId ?? null,
        debitCardId: (s as any).debitCardId ?? null,
      })),
    });
  }

  private async recalcSplitCards(splits: SplitInput[]) {
    const cardIds = [
      ...new Set(
        splits.filter((s) => s.creditCardId).map((s) => s.creditCardId!),
      ),
    ];
    await this.recalcCardLimits(cardIds);
  }

  private async withCreatedByName<T extends { createdById?: string | null }>(
    transaction: T,
  ): Promise<T & { createdByName: string | null }> {
    if (!transaction?.createdById) {
      return {
        ...transaction,
        createdByName: null,
      };
    }

    if (this.createdByNameCache.has(transaction.createdById)) {
      return {
        ...transaction,
        createdByName:
          this.createdByNameCache.get(transaction.createdById) ?? null,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: transaction.createdById },
      select: { name: true, email: true },
    });

    const createdByName = user?.name || user?.email || null;
    this.createdByNameCache.set(transaction.createdById, createdByName);

    return {
      ...transaction,
      createdByName,
    };
  }

  async findDuplicateTransaction(
    data: AIReceiptData,
  ): Promise<TransactionWithCount | null> {
    const normalizedCategory =
      data.category.charAt(0).toUpperCase() +
      data.category.slice(1).toLowerCase();

    const dueDate = parseDateLocal((data as any).dueDate);
    const paymentDate = parseDateLocal((data as any).paymentDate);

    const existingTx = await this.prisma.transaction.findFirst({
      where: {
        userId: this.userId,
        description: data.description,
        amount: data.amount,
        categoryName: normalizedCategory,
        type: data.type,
        status: data.status,
        dueDate,
        paymentDate,
        creditCardId: data.creditCardId ?? null,
        debitCardId: data.debitCardId ?? null,
      },
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    if (!existingTx) return null;
    return (await this.withCreatedByName(existingTx)) as any;
  }

  async createTransaction(
    data: AIReceiptData,
    options?: CreateTransactionOptions,
  ): Promise<TransactionWithCount> {
    const normalizedCategory =
      data.category.charAt(0).toUpperCase() +
      data.category.slice(1).toLowerCase();
    const {
      category,
      creditCardId,
      debitCardId,
      splits,
      installments: dataInstallments,
      purchaseDate,
      ...transactionData
    } = data as any;

    const dueDate = parseDateLocal((data as any).dueDate);
    const paymentDate = parseDateLocal((data as any).paymentDate);

    const categoryIdToConnect =
      await this.resolveCategoryId(normalizedCategory);

    const createData: any = {
      ...transactionData,
      dueDate,
      paymentDate,
      userId: this.userId,
      createdById: (data as any).createdById ?? this.actorUserId,
      category: normalizedCategory,
      categoryName: normalizedCategory,
    };

    if (categoryIdToConnect) {
      createData.categoryRel = { connect: { id: categoryIdToConnect } };
    } else {
      createData.categoryRel = {
        create: {
          userId: this.userId,
          name: normalizedCategory,
          icon: 'tag',
        },
      };
    }

    if (!splits && creditCardId) {
      createData.creditCard = { connect: { id: creditCardId } };
    }

    if (!splits && !creditCardId && debitCardId) {
      createData.debitCard = { connect: { id: debitCardId } };
    }

    const installments = Number(dataInstallments ?? 1);
    if (installments > 1) {
      const purchaseDate =
        parseDateLocal(
          (data as any).purchaseDate ??
            data.paymentDate ??
            data.dueDate ??
            new Date(),
        ) ?? new Date();

      const totalAmount = Number(transactionData.amount);
      const baseAmount = Math.floor((totalAmount / installments) * 100) / 100;
      const remainder = Number(
        (totalAmount - baseAmount * installments).toFixed(2),
      );

      const installmentGroup = await this.prisma.installmentGroup.create({
        data: {
          userId: this.userId,
          title: createData.description,
          totalAmount,
          installments,
          purchaseDate,
          categoryId: categoryIdToConnect ?? null,
        },
      });

      const createdTxs: any[] = [];
      for (let i = 1; i <= installments; i++) {
        const amount =
          i === installments
            ? Number((baseAmount + remainder).toFixed(2))
            : baseAmount;
        const due = addMonths(purchaseDate, i - 1);

        const statusValue =
          (createData.status as string | undefined) ?? 'pending';
        const child = await this.prisma.transaction.create({
          data: {
            ...createData,
            amount,
            description: createData.description,
            status: i === 1 ? statusValue : 'pending',
            dueDate: due,
            paymentDate: null,
            installmentGroup: { connect: { id: installmentGroup.id } },
            installmentCurrent: i,
          },
          include: {
            categoryRel: true,
            creditCard: true,
            debitCard: true,
            splits: { include: { creditCard: true, debitCard: true } },
          },
        });

        if (!categoryIdToConnect && child.categoryRel?.id) {
          this.categoryIdCache.set(normalizedCategory, child.categoryRel.id);
        }

        createdTxs.push(child);
      }

      if (creditCardId && !options?.skipCardRecalc) {
        await this.recalcCardLimit(creditCardId);
      }

      return await this.withCreatedByName(createdTxs[0]);
    }

    const tx = await this.prisma.transaction.create({
      data: createData,
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    if (!categoryIdToConnect && tx.categoryRel?.id) {
      this.categoryIdCache.set(normalizedCategory, tx.categoryRel.id);
    }

    if (splits && splits.length >= 2) {
      await this.createSplits(tx.id, splits as SplitInput[]);
      if (!options?.skipCardRecalc) {
        await this.recalcSplitCards(splits as SplitInput[]);
      }
    } else if (tx.creditCardId && !options?.skipCardRecalc) {
      await this.recalcCardLimit(tx.creditCardId);
    }
    return (await this.withCreatedByName(tx)) as any;
  }

  async getTransactions({
    page,
    limit,
    query,
    categoryId,
    type,
    status,
    startDate,
    endDate,
    month,
    year,
    creditCardId,
  }: GetTransactionsInput) {
    const where: any = {
      userId: this.userId,
    };

    if (query) {
      where.description = {
        contains: query,
        mode: 'insensitive',
      };
    }

    if (categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (cat) {
        if (cat.isGlobal) {
          where.OR = [{ categoryId }, { categoryName: cat.name }];
        } else {
          where.categoryId = categoryId;
        }
      }
    }
    if (type) where.type = type;
    if (status) where.status = status;
    if (creditCardId) where.creditCardId = creditCardId;

    const user = await this.userContext.localUser;
    if (user) {
      const limits = PLAN_LIMITS[user.planTier];
      if (Number.isFinite(limits.historyMonths) && limits.historyMonths > 0) {
        const limitedAt = new Date();
        limitedAt.setMonth(limitedAt.getMonth() - limits.historyMonths);
        limitedAt.setHours(0, 0, 0, 0);

        if (!where.createdAt) {
          where.createdAt = { gte: limitedAt };
        } else {
          const existingGte = where.createdAt.gte;
          if (!existingGte || existingGte < limitedAt) {
            where.createdAt.gte = limitedAt;
          }
        }
      }
    }

    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    }

    if (startDate || endDate) {
      const normalizedStart = startDate
        ? (() => {
            const d = parseDateLocal(startDate) as Date;
            d.setHours(0, 0, 0, 0);
            return d;
          })()
        : undefined;

      const normalizedEnd = endDate
        ? (() => {
            const d = parseDateLocal(endDate) as Date;
            d.setHours(23, 59, 59, 999);
            return d;
          })()
        : undefined;

      const effectiveDateRange: any = {};
      if (normalizedStart) effectiveDateRange.gte = normalizedStart;
      if (normalizedEnd) effectiveDateRange.lte = normalizedEnd;

      if (!where.AND) where.AND = [];
      where.AND.push({
        OR: [
          { paymentDate: effectiveDateRange },
          {
            paymentDate: null,
            dueDate: effectiveDateRange,
          },
          {
            paymentDate: null,
            dueDate: null,
            createdAt: effectiveDateRange,
          },
        ],
      });
    }

    const total = await this.prisma.transaction.count({ where });
    const data = await this.prisma.transaction.findMany({
      where,
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
      orderBy: [
        { paymentDate: 'desc' },
        { dueDate: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    const createdByIds = [
      ...new Set(data.map((tx) => tx.createdById).filter(Boolean) as string[]),
    ];
    const users =
      createdByIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: createdByIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const usersMap = new Map(users.map((user) => [user.id, user]));

    const enrichedData = data.map((tx) => ({
      ...tx,
      createdByName: tx.createdById
        ? usersMap.get(tx.createdById)?.name ||
          usersMap.get(tx.createdById)?.email ||
          null
        : null,
    }));

    return {
      data: enrichedData as any,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(id: string): Promise<TransactionWithCount | null> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    if (!tx) return null;
    return (await this.withCreatedByName(tx)) as any;
  }

  async getInstallmentTransactions(
    installmentGroupId: string,
  ): Promise<TransactionWithCount[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { installmentGroupId },
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
      },
      orderBy: { installmentCurrent: 'asc' },
    });

    const enriched = await Promise.all(
      transactions.map((tx) => this.withCreatedByName(tx)),
    );

    return enriched as any;
  }

  async updateTransaction(
    id: string,
    data: UpdateTransactionInput,
  ): Promise<TransactionWithCount> {
    const {
      categoryId,
      creditCardId,
      debitCardId,
      splits,
      installments,
      ...restData
    } = data as any;
    const updateData: any = { ...restData };

    if (restData.dueDate !== undefined) {
      updateData.dueDate = parseDateLocal(restData.dueDate);
    }
    if (restData.paymentDate !== undefined) {
      updateData.paymentDate = parseDateLocal(restData.paymentDate);
    }

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (category) {
        updateData.categoryRel = { connect: { id: categoryId } };
        updateData.category = category.name;
        updateData.categoryName = category.name;
      }
    }

    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId: this.userId },
      include: { splits: true },
    });
    if (!existing) {
      const notFoundError: any = new Error('Transaction not found');
      notFoundError.code = 'P2025';
      throw notFoundError;
    }
    const priorCardId: string | null = existing?.creditCardId ?? null;
    const priorSplitCardIds = [
      ...new Set(
        (existing?.splits ?? [])
          .filter((s: any) => s.creditCardId)
          .map((s: any) => s.creditCardId as string),
      ),
    ];

    const hasSplits = splits && (splits as SplitInput[]).length > 0;
    const requestedInstallments = Number(installments ?? 1);

    if (Number.isFinite(requestedInstallments) && requestedInstallments > 1) {
      return this.updateTransactionWithInstallments({
        id,
        existing,
        updateData,
        splits: hasSplits ? (splits as SplitInput[]) : null,
        requestedInstallments: Math.trunc(requestedInstallments),
        priorCardId,
        priorSplitCardIds,
      });
    }

    if (hasSplits) {
      updateData.creditCard = { disconnect: true };
      updateData.debitCard = { disconnect: true };
      await this.prisma.transactionSplit.deleteMany({
        where: { transactionId: id },
      });
    } else if (creditCardId !== undefined || debitCardId !== undefined) {
      if (creditCardId) {
        updateData.creditCard = { connect: { id: creditCardId } };
        updateData.debitCard = { disconnect: true };
      } else if (debitCardId) {
        updateData.debitCard = { connect: { id: debitCardId } };
        updateData.creditCard = { disconnect: true };
      } else {
        updateData.creditCard = { disconnect: true };
        updateData.debitCard = { disconnect: true };
      }
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    if (hasSplits) {
      await this.createSplits(id, splits as SplitInput[]);
      const allCardIds = [
        ...new Set([
          ...priorSplitCardIds,
          ...(splits as SplitInput[])
            .filter((s) => s.creditCardId)
            .map((s) => s.creditCardId!),
          ...(priorCardId ? [priorCardId] : []),
        ]),
      ];
      await Promise.all(allCardIds.map((cid) => this.recalcCardLimit(cid)));
    } else {
      if (priorCardId && priorCardId !== updated.creditCardId) {
        await this.recalcCardLimit(priorCardId);
      }
      if (priorSplitCardIds.length > 0) {
        await Promise.all(
          priorSplitCardIds.map((cid) => this.recalcCardLimit(cid)),
        );
      }
      if (updated.creditCardId) {
        await this.recalcCardLimit(updated.creditCardId);
      }
    }

    const finalTransaction = await this.prisma.transaction.findFirst({
      where: { id, userId: this.userId },
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    return finalTransaction
      ? ((await this.withCreatedByName(finalTransaction)) as any)
      : (finalTransaction as any);
  }

  private allocateInstallmentAmounts(totalAmount: number, installments: number) {
    const safeTotal = Number.isFinite(totalAmount) ? totalAmount : 0;
    const safeInstallments = Math.max(1, Math.trunc(installments));
    const baseAmount = Math.floor((safeTotal / safeInstallments) * 100) / 100;
    const remainder = Number(
      (safeTotal - baseAmount * safeInstallments).toFixed(2),
    );

    return Array.from({ length: safeInstallments }).map((_, index) =>
      index === safeInstallments - 1
        ? Number((baseAmount + remainder).toFixed(2))
        : baseAmount,
    );
  }

  private async updateTransactionWithInstallments(params: {
    id: string;
    existing: any;
    updateData: any;
    splits: SplitInput[] | null;
    requestedInstallments: number;
    priorCardId: string | null;
    priorSplitCardIds: string[];
  }): Promise<TransactionWithCount> {
    const {
      id,
      existing,
      updateData,
      splits,
      requestedInstallments,
      priorCardId,
      priorSplitCardIds,
    } = params;

    const totalAmount = Number(updateData.amount ?? existing.amount ?? 0);
    const installments = Math.max(1, Math.trunc(requestedInstallments));
    const splitSource: SplitInput[] = Array.isArray(splits) && splits.length > 0
      ? splits
      : Array.isArray(existing?.splits) && existing.splits.length > 0
        ? existing.splits.map((split: any) => ({
            amount: Number(split.amount),
            paymentMethod: split.paymentMethod,
            creditCardId: split.creditCardId ?? null,
            debitCardId: split.debitCardId ?? null,
          }))
        : [];
    const hasSplits = splitSource.length > 0;

    const purchaseDate =
      parseDateLocal(updateData.paymentDate ?? updateData.dueDate) ??
      parseDateLocal(existing.paymentDate ?? existing.dueDate) ??
      new Date();

    const categoryIdForGroup =
      updateData?.categoryRel?.connect?.id ?? existing?.categoryId ?? null;

    const installmentGroup = existing.installmentGroupId
      ? await this.prisma.installmentGroup.update({
          where: { id: existing.installmentGroupId },
          data: {
            title: updateData.description ?? existing.description,
            totalAmount,
            installments,
            purchaseDate,
            categoryId: categoryIdForGroup,
          },
        })
      : await this.prisma.installmentGroup.create({
          data: {
            userId: this.userId,
            title: updateData.description ?? existing.description,
            totalAmount,
            installments,
            purchaseDate,
            categoryId: categoryIdForGroup,
          },
        });

    const perSplitAmounts = hasSplits
      ? splitSource.map((split) =>
          this.allocateInstallmentAmounts(Number(split.amount), installments),
        )
      : [];

    const installmentAmounts = hasSplits
      ? Array.from({ length: installments }).map((_, installmentIndex) =>
          Number(
            perSplitAmounts
              .reduce(
                (sum, splitAmounts) => sum + Number(splitAmounts[installmentIndex] ?? 0),
                0,
              )
              .toFixed(2),
          ),
        )
      : this.allocateInstallmentAmounts(totalAmount, installments);

    const statusValue = (updateData.status as string | undefined) ?? existing.status;
    const paidDate = parseDateLocal(updateData.paymentDate ?? existing.paymentDate);

    const firstUpdateData: any = {
      ...updateData,
      amount: installmentAmounts[0],
      installmentGroup: { connect: { id: installmentGroup.id } },
      installmentCurrent: 1,
      dueDate: purchaseDate,
      paymentDate: statusValue === 'paid' ? paidDate ?? purchaseDate : null,
    };

    if (hasSplits) {
      firstUpdateData.creditCard = { disconnect: true };
      firstUpdateData.debitCard = { disconnect: true };
    }

    const updatedFirst = await this.prisma.transaction.update({
      where: { id },
      data: firstUpdateData,
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    await this.prisma.transactionSplit.deleteMany({ where: { transactionId: id } });

    if (hasSplits) {
      const firstSplits = splitSource
        .map((split, splitIndex) => ({
          amount: Number(perSplitAmounts[splitIndex][0] ?? 0),
          paymentMethod: split.paymentMethod,
          creditCardId: split.creditCardId ?? null,
          debitCardId: (split as any).debitCardId ?? null,
        }))
        .filter((split) => split.amount > 0);

      if (firstSplits.length > 0) {
        await this.createSplits(id, firstSplits as SplitInput[]);
      }
    }

    await this.prisma.transaction.deleteMany({
      where: {
        userId: this.userId,
        installmentGroupId: installmentGroup.id,
        id: { not: id },
      },
    });

    for (let i = 1; i < installments; i++) {
      const childDueDate = addMonths(purchaseDate, i);

      const child = await this.prisma.transaction.create({
        data: {
          userId: this.userId,
          createdById: updatedFirst.createdById ?? this.actorUserId,
          amount: installmentAmounts[i],
          description: updatedFirst.description,
          category: updatedFirst.category,
          type: updatedFirst.type,
          status: 'pending',
          dueDate: childDueDate,
          paymentDate: null,
          rawText: updatedFirst.rawText,
          attachmentKey: null,
          attachmentOriginalName: null,
          attachmentMimeType: null,
          attachmentSize: null,
          categoryName: updatedFirst.categoryName,
          categoryRel: updatedFirst.categoryId
            ? { connect: { id: updatedFirst.categoryId } }
            : undefined,
          creditCard: !hasSplits && updatedFirst.creditCardId
            ? { connect: { id: updatedFirst.creditCardId } }
            : undefined,
          debitCard: !hasSplits && updatedFirst.debitCardId
            ? { connect: { id: updatedFirst.debitCardId } }
            : undefined,
          installmentGroup: { connect: { id: installmentGroup.id } },
          installmentCurrent: i + 1,
        },
        include: {
          categoryRel: true,
          creditCard: true,
          debitCard: true,
          splits: { include: { creditCard: true, debitCard: true } },
        },
      });

      if (hasSplits) {
        const childSplits = splitSource
          .map((split, splitIndex) => ({
            amount: Number(perSplitAmounts[splitIndex][i] ?? 0),
            paymentMethod: split.paymentMethod,
            creditCardId: split.creditCardId ?? null,
            debitCardId: (split as any).debitCardId ?? null,
          }))
          .filter((split) => split.amount > 0);

        if (childSplits.length > 0) {
          await this.createSplits(child.id, childSplits as SplitInput[]);
        }
      }
    }

    const currentCardIds = hasSplits
      ? [
          ...new Set(
            splitSource
              .filter((split) => split.creditCardId)
              .map((split) => split.creditCardId as string),
          ),
        ]
      : updatedFirst.creditCardId
        ? [updatedFirst.creditCardId]
        : [];

    const recalcCardIds = [
      ...new Set([
        ...priorSplitCardIds,
        ...currentCardIds,
        ...(priorCardId ? [priorCardId] : []),
      ]),
    ];

    if (recalcCardIds.length > 0) {
      await Promise.all(recalcCardIds.map((cid) => this.recalcCardLimit(cid)));
    }

    const finalTransaction = await this.prisma.transaction.findFirst({
      where: { id, userId: this.userId },
      include: {
        categoryRel: true,
        creditCard: true,
        debitCard: true,
        splits: { include: { creditCard: true, debitCard: true } },
      },
    });

    return finalTransaction
      ? ((await this.withCreatedByName(finalTransaction)) as any)
      : (finalTransaction as any);
  }

  async deleteTransaction(
    id: string,
  ): Promise<{ attachmentKey: string | null }> {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId: this.userId },
      include: { splits: true },
    });
    if (!tx) {
      const notFoundError: any = new Error('Transaction not found');
      notFoundError.code = 'P2025';
      throw notFoundError;
    }
    const splitCardIds = [
      ...new Set(
        (tx?.splits ?? [])
          .filter((s: any) => s.creditCardId)
          .map((s: any) => s.creditCardId as string),
      ),
    ];
    await this.prisma.transaction.delete({ where: { id } });
    if (tx?.creditCardId) {
      await this.recalcCardLimit(tx.creditCardId);
    }
    if (splitCardIds.length > 0) {
      await Promise.all(splitCardIds.map((cid) => this.recalcCardLimit(cid)));
    }
    return { attachmentKey: tx?.attachmentKey ?? null };
  }
}
