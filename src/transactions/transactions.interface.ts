import { Prisma } from 'generated/prisma/client';
import {
    AIReceiptData,
    GetTransactionsInput,
    UpdateTransactionInput,
} from 'src/schemas/transactions.schema';

export type TransactionWithCount = Prisma.TransactionGetPayload<{
  include: {
    categoryRel: true;
    creditCard: true;
    debitCard: true;
  };
}>;

export type CreateTransactionOptions = {
  skipCardRecalc?: boolean;
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
