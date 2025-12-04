import { Injectable } from "@nestjs/common";
import { Transaction } from "generated/prisma/client";
import { AIReceiptData } from "src/schemas/transactions.schema";

export abstract class TransactionsRepositoryInterface {
    abstract createTransaction(data: AIReceiptData): Promise<Transaction>;
}