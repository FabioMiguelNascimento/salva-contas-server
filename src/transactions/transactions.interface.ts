import { Transaction } from "generated/prisma/client";
import { AIReceiptData, CreateTransactionInput, GetTransactionsInput } from "src/schemas/transactions.schema";

export abstract class TransactionsRepositoryInterface {
    abstract createTransaction(data: AIReceiptData): Promise<Transaction>;
    abstract createManualTransaction(data: CreateTransactionInput): Promise<Transaction>;
    abstract getTransactions(filters: GetTransactionsInput): Promise<{ data: Transaction[]; meta: { total: number; page: number; limit: number; totalPages: number } }>;
}