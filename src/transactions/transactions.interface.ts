import { Prisma } from "generated/prisma/client";
import { AIReceiptData, CreateTransactionInput, GetTransactionsInput, UpdateTransactionInput } from "src/schemas/transactions.schema";

export type TransactionWithCount = Prisma.TransactionGetPayload<{
    include: {
        categoryRel: true;
        creditCard: true;
        _count: {
            select: {
                attachments: true;
            };
        };
    };
}>;

export abstract class TransactionsRepositoryInterface {
    abstract createTransaction(data: AIReceiptData): Promise<TransactionWithCount>;
    abstract createManualTransaction(data: CreateTransactionInput): Promise<TransactionWithCount>;
    abstract getTransactions(filters: GetTransactionsInput): Promise<{ data: TransactionWithCount[]; meta: { total: number; page: number; limit: number; totalPages: number } }>;
    abstract updateTransaction(id: string, data: UpdateTransactionInput): Promise<TransactionWithCount>;
    abstract deleteTransaction(id: string): Promise<void>;
}