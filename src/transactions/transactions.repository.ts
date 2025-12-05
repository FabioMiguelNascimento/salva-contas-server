import { Injectable } from "@nestjs/common";
import { Transaction } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AIReceiptData, CreateTransactionInput, GetTransactionsInput } from "src/schemas/transactions.schema";
import { TransactionsRepositoryInterface } from "./transactions.interface";

@Injectable()
export default class TransactionsRepository extends TransactionsRepositoryInterface {
    private readonly DEV_USER_ID = '00000000-0000-0000-0000-000000000000'; 

    constructor(private prisma: PrismaService) {
        super();
    }

    async createTransaction(data: AIReceiptData): Promise<Transaction> {
        const normalizedCategory = data.category.charAt(0).toUpperCase() + data.category.slice(1).toLowerCase();
        const { category, ...transactionData } = data;

        return this.prisma.transaction.create({
            data: {
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
            },
            include: {
                categoryRel: true
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
                categoryRel: true
            }
        });
    }

    async getTransactions({ page, limit, categoryId, type, status, startDate, endDate, month, year }: GetTransactionsInput) {
        const where: any = {
            userId: this.DEV_USER_ID,
        };

        if (categoryId) where.categoryId = categoryId;
        if (type) where.type = type;
        if (status) where.status = status;

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
                categoryRel: true
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
}