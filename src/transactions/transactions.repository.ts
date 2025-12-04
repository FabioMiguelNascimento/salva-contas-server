import { Injectable } from "@nestjs/common";
import { Transaction } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AIReceiptData } from "src/schemas/transactions.schema";
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
}