import { Injectable } from "@nestjs/common";
import { Transaction } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AIReceiptData, CreateTransactionInput, GetTransactionsInput, UpdateTransactionInput } from "src/schemas/transactions.schema";
import { TransactionsRepositoryInterface } from "./transactions.interface";

@Injectable()
export default class TransactionsRepository extends TransactionsRepositoryInterface {
    private readonly DEV_USER_ID = '00000000-0000-0000-0000-000000000000'; 

    constructor(private prisma: PrismaService) {
        super();
    }

    async createTransaction(data: AIReceiptData): Promise<Transaction> {
        const normalizedCategory = data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase();
        const { category, creditCardId, ...transactionData } = data;

        const createData: any = {
            ...transactionData,
            userId: this.DEV_USER_ID,
            category: normalizedCategory,
            categoryName: normalizedCategory,
            categoryRel: {
                connectOrCreate: {
                    where: {
                        userId_name: {
                            userId: this.DEV_USER_ID,
                            name: normalizedCategory
                        }
                    },
                    create: {
                        userId: this.DEV_USER_ID,
                        name: normalizedCategory,
                        icon: 'tag'
                    }
                }
            }
        };

        // Conectar cartão de crédito se fornecido
        if (creditCardId) {
            createData.creditCard = { connect: { id: creditCardId } };
        }

        return this.prisma.transaction.create({
            data: createData,
            include: {
                categoryRel: true,
                creditCard: true,
            }
        });
    }

    async createManualTransaction(data: CreateTransactionInput): Promise<Transaction> {
        const category = await this.prisma.category.findUnique({
            where: { id: data.categoryId }
        });

        if (!category) {
            throw new Error('Category not found');
        }

        return this.prisma.transaction.create({
            data: {
                ...data,
                userId: this.DEV_USER_ID,
                category: category.name,
                categoryName: category.name,
            },
            include: {
                categoryRel: true,
                creditCard: true,
            }
        });
    }

    async getTransactions({ page, limit, categoryId, type, status, startDate, endDate, month, year, creditCardId }: GetTransactionsInput) {
        const where: any = {
            userId: this.DEV_USER_ID,
        };

        if (categoryId) where.categoryId = categoryId;
        if (type) where.type = type;
        if (status) where.status = status;
        if (creditCardId) where.creditCardId = creditCardId;

        // Se month e year fornecidos, sobrescreve startDate e endDate
        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0); // Último dia do mês
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = startDate;
            if (endDate) where.createdAt.lte = endDate;
        }

        const total = await this.prisma.transaction.count({ where });
        const data = await this.prisma.transaction.findMany({
            where,
            include: {
                categoryRel: true,
                creditCard: true,
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

    async updateTransaction(id: string, data: UpdateTransactionInput): Promise<Transaction> {
        const { categoryId, creditCardId, ...restData } = data;
        const updateData: any = { ...restData };

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
            },
        });
    }

    async deleteTransaction(id: string): Promise<void> {
        await this.prisma.transaction.delete({
            where: { id },
        });
    }
}