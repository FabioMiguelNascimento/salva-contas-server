import { Injectable, Scope } from "@nestjs/common";
import { UserContext } from "src/auth/user-context.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AIReceiptData, CreateTransactionInput, GetTransactionsInput, UpdateTransactionInput } from "src/schemas/transactions.schema";
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

    async createTransaction(data: AIReceiptData): Promise<TransactionWithCount> {
        const normalizedCategory = data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase();
        const { category, creditCardId, ...transactionData } = data;

        const dueDate = parseDateLocal((data as any).dueDate);
        const paymentDate = parseDateLocal((data as any).paymentDate);

        const createData: any = {
            ...transactionData,
            dueDate,
            paymentDate,
            userId: this.userId,
            category: normalizedCategory,
            categoryName: normalizedCategory,
            categoryRel: {
                connectOrCreate: {
                    where: {
                        userId_name: {
                            userId: this.userId,
                            name: normalizedCategory
                        }
                    },
                    create: {
                        userId: this.userId,
                        name: normalizedCategory,
                        icon: 'tag'
                    }
                }
            }
        };

        if (creditCardId) {
            createData.creditCard = { connect: { id: creditCardId } };
        }

        return this.prisma.transaction.create({
            data: createData,
            include: {
                categoryRel: true,
                creditCard: true,
                _count: {
                    select: {
                        attachments: true,
                    },
                },
            }
        });
    }

    async createManualTransaction(data: CreateTransactionInput): Promise<TransactionWithCount> {
        const category = await this.prisma.category.findUnique({
            where: { id: data.categoryId }
        });

        if (!category) {
            throw new Error('Category not found');
        }

        const { creditCardId, ...transactionData } = data;

        const dueDate = parseDateLocal((data as any).dueDate);
        const paymentDate = parseDateLocal((data as any).paymentDate);

        const createData: any = {
            ...transactionData,
            dueDate,
            paymentDate,
            userId: this.userId,
            category: category.name,
            categoryName: category.name,
        };

        if (creditCardId) {
            createData.creditCard = { connect: { id: creditCardId } };
        }

        return this.prisma.transaction.create({
            data: createData,
            include: {
                categoryRel: true,
                creditCard: true,
                _count: {
                    select: {
                        attachments: true,
                    },
                },
            }
        });
    }

    async getTransactions({ page, limit, categoryId, type, status, startDate, endDate, month, year, creditCardId }: GetTransactionsInput) {
        const where: any = {
            userId: this.userId,
        };

        if (categoryId) where.categoryId = categoryId;
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
                _count: {
                    select: {
                        attachments: true,
                    },
                },
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
        const { categoryId, creditCardId, ...restData } = data;
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
                updateData.category = category.name;
                updateData.categoryName = category.name;
                updateData.categoryRel = { connect: { id: categoryId } };
            }
        }

        if (creditCardId) {
            updateData.creditCard = { connect: { id: creditCardId } };
        }

        return this.prisma.transaction.update({
            where: { id },
            data: updateData,
            include: {
                categoryRel: true,
                creditCard: true,
                _count: {
                    select: {
                        attachments: true,
                    },
                },
            },
        });
    }

    async deleteTransaction(id: string): Promise<void> {
        await this.prisma.transaction.delete({
            where: { id },
        });
    }
}