import { Injectable, Scope } from "@nestjs/common";
import { UserContext } from "src/auth/user-context.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AIReceiptData, GetTransactionsInput, SplitInput, UpdateTransactionInput } from "src/schemas/transactions.schema";
import { parseDateLocal } from "src/utils/date-utils";
import { TransactionsRepositoryInterface, TransactionWithCount } from "./transactions.interface";

@Injectable({ scope: Scope.REQUEST })
export default class TransactionsRepository extends TransactionsRepositoryInterface {
    constructor(
        private prisma: PrismaService,
        private userContext: UserContext,
    ) {
        super();
    }

    private get userId(): string {
        return this.userContext.userId;
    }

    private async recalcCardLimit(cardId: string) {
        const card = await this.prisma.creditCard.findUnique({ where: { id: cardId } });
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

        const debt = Number(txAgg._sum.amount || 0) + Number(splitAgg._sum.amount || 0);
        const newAvailable = Number(card.limit) - debt;
        await this.prisma.creditCard.update({
            where: { id: cardId },
            data: { availableLimit: newAvailable },
        });
    }

    private async createSplits(transactionId: string, splits: SplitInput[]) {
        await this.prisma.transactionSplit.createMany({
            data: splits.map((s) => ({
                transactionId,
                amount: s.amount,
                paymentMethod: s.paymentMethod,
                creditCardId: s.creditCardId ?? null,
            })),
        });
    }

    private async recalcSplitCards(splits: SplitInput[]) {
        const cardIds = [...new Set(splits.filter((s) => s.creditCardId).map((s) => s.creditCardId!))];
        await Promise.all(cardIds.map((cardId) => this.recalcCardLimit(cardId)));
    }

    async createTransaction(data: AIReceiptData): Promise<TransactionWithCount> {
        const normalizedCategory = data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase();
        const { category, creditCardId, splits, ...transactionData } = data;

        const dueDate = parseDateLocal((data as any).dueDate);
        const paymentDate = parseDateLocal((data as any).paymentDate);

    let categoryToConnect = await this.prisma.category.findFirst({
      where: {
        name: normalizedCategory,
        OR: [
          { userId: this.userId },
          { isGlobal: true },
        ],
      },
      orderBy: { userId: 'desc' },
    });

    if (!categoryToConnect) {
    }

    const createData: any = {
        ...transactionData,
        dueDate,
        paymentDate,
        userId: this.userId,
        createdById: this.userId,
        category: normalizedCategory,
        categoryName: normalizedCategory,
    };

    if (categoryToConnect) {
      createData.categoryRel = { connect: { id: categoryToConnect.id } };
    } else {
      createData.categoryRel = {
        create: {
          userId: this.userId,
          name: normalizedCategory,
          icon: 'tag',
        },
      };
    }

    // Connect credit card only when no splits and creditCardId is provided
    if (!splits && creditCardId) {
      createData.creditCard = { connect: { id: creditCardId } };
    }

const tx = await this.prisma.transaction.create({
      data: createData,
      include: {
        categoryRel: true,
        creditCard: true,
        splits: { include: { creditCard: true } },
      },
    });

    if (splits && splits.length >= 2) {
      await this.createSplits(tx.id, splits as SplitInput[]);
      await this.recalcSplitCards(splits as SplitInput[]);
    } else if (tx.creditCardId) {
      await this.recalcCardLimit(tx.creditCardId);
    }
    return tx;
  }

    async getTransactions({ page, limit, categoryId, type, status, startDate, endDate, month, year, creditCardId }: GetTransactionsInput) {
        const where: any = {
            userId: this.userId,
        };

        if (categoryId) {
            const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
            if (cat) {
                if (cat.isGlobal) {
                    where.OR = [
                        { categoryId },
                        { categoryName: cat.name },
                    ];
                } else {
                    where.categoryId = categoryId;
                }
            }
        }
        if (type) where.type = type;
        if (status) where.status = status;
        if (creditCardId) where.creditCardId = creditCardId;

        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
        }

        if (startDate || endDate) {
            const normalizedStart = startDate ? (() => {
                const d = parseDateLocal(startDate) as Date;
                d.setHours(0,0,0,0);
                return d;
            })() : undefined;

            const normalizedEnd = endDate ? (() => {
                const d = parseDateLocal(endDate) as Date;
                d.setHours(23,59,59,999);
                return d;
            })() : undefined;

            where.createdAt = {};
            if (normalizedStart) where.createdAt.gte = normalizedStart;
            if (normalizedEnd) where.createdAt.lte = normalizedEnd;
        }

        const total = await this.prisma.transaction.count({ where });
        const data = await this.prisma.transaction.findMany({
            where,
            include: {
                categoryRel: true,
                creditCard: true,
                splits: { include: { creditCard: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        };
    }

    async updateTransaction(id: string, data: UpdateTransactionInput): Promise<TransactionWithCount> {
        const { categoryId, creditCardId, splits, ...restData } = data as any;
        const updateData: any = { ...restData };

        if ((restData as any).dueDate !== undefined) {
            updateData.dueDate = parseDateLocal((restData as any).dueDate);
        }
        if ((restData as any).paymentDate !== undefined) {
            updateData.paymentDate = parseDateLocal((restData as any).paymentDate);
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

        const existing = await this.prisma.transaction.findUnique({
            where: { id },
            include: { splits: true },
        });
        const priorCardId: string | null = existing?.creditCardId ?? null;
        const priorSplitCardIds = [...new Set(
            (existing?.splits ?? []).filter((s: any) => s.creditCardId).map((s: any) => s.creditCardId as string)
        )];

        const hasSplits = splits && (splits as SplitInput[]).length > 0;

        if (hasSplits) {
            updateData.creditCard = { disconnect: true };
            await this.prisma.transactionSplit.deleteMany({ where: { transactionId: id } });
        } else if (creditCardId !== undefined) {
            if (creditCardId) {
                updateData.creditCard = { connect: { id: creditCardId } };
            } else {
                updateData.creditCard = { disconnect: true };
            }
        }

        const updated = await this.prisma.transaction.update({
            where: { id },
            data: updateData,
            include: {
                categoryRel: true,
                creditCard: true,
                splits: { include: { creditCard: true } },
            },
        });

        if (hasSplits) {
            await this.createSplits(id, splits as SplitInput[]);
            const allCardIds = [...new Set([
                ...priorSplitCardIds,
                ...(splits as SplitInput[]).filter((s) => s.creditCardId).map((s) => s.creditCardId!),
                ...(priorCardId ? [priorCardId] : []),
            ])];
            await Promise.all(allCardIds.map((cid) => this.recalcCardLimit(cid)));
        } else {
            if (priorCardId && priorCardId !== updated.creditCardId) {
                await this.recalcCardLimit(priorCardId);
            }
            if (priorSplitCardIds.length > 0) {
                await Promise.all(priorSplitCardIds.map((cid) => this.recalcCardLimit(cid)));
            }
            if (updated.creditCardId) {
                await this.recalcCardLimit(updated.creditCardId);
            }
        }

        return this.prisma.transaction.findUnique({
            where: { id },
            include: { categoryRel: true, creditCard: true, splits: { include: { creditCard: true } } },
        }) as any;
    }

    async deleteTransaction(id: string): Promise<void> {
        const tx = await this.prisma.transaction.findUnique({
            where: { id },
            include: { splits: true },
        });
        const splitCardIds = [...new Set(
            (tx?.splits ?? []).filter((s: any) => s.creditCardId).map((s: any) => s.creditCardId as string)
        )];
        await this.prisma.transaction.delete({ where: { id } });
        if (tx?.creditCardId) {
            await this.recalcCardLimit(tx.creditCardId);
        }
        if (splitCardIds.length > 0) {
            await Promise.all(splitCardIds.map((cid) => this.recalcCardLimit(cid)));
        }
    }
}