import { Prisma } from 'generated/prisma/client';
import {
    AIReceiptData,
    GetPendingBillsInput,
    GetTransactionsInput,
    UpdateTransactionInput,
} from 'src/schemas/transactions.schema';

export type TransactionWithCount = Prisma.TransactionGetPayload<{
  include: {
    categoryRel: true;
    creditCard: true;
    debitCard: true;
    splits: { include: { creditCard: true; debitCard: true } };
  };
}>;

export type CreateTransactionOptions = {
  skipCardRecalc?: boolean;
};

export type PendingBillsSummary = {
  total: number;
  overdueAmount: number;
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
};

export type PendingBillsResponse = {
  data: TransactionWithCount[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  summary: PendingBillsSummary;
};

export abstract class TransactionsRepositoryInterface {
  abstract createTransaction(
    data: AIReceiptData,
    options?: CreateTransactionOptions,
  ): Promise<TransactionWithCount>;
  abstract recalcCardLimits(cardIds: string[]): Promise<void>;
  abstract findDuplicateTransaction(
    data: AIReceiptData,
  ): Promise<TransactionWithCount | null>;
  abstract getTransactions(filters: GetTransactionsInput): Promise<{
    data: TransactionWithCount[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>;
  abstract getPendingBills(
    filters: GetPendingBillsInput,
  ): Promise<PendingBillsResponse>;
  abstract updateTransaction(
    id: string,
    data: UpdateTransactionInput,
  ): Promise<TransactionWithCount>;
  abstract deleteTransaction(
    id: string,
  ): Promise<{ attachmentKey: string | null }>;
  abstract getTransactionById(id: string): Promise<TransactionWithCount | null>;
  abstract getInstallmentTransactions(
    installmentGroupId: string,
  ): Promise<TransactionWithCount[]>;
}
