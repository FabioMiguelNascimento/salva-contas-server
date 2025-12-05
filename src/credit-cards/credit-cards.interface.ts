import type { CreditCard } from '../../generated/prisma/client';
import { CreateCreditCardInput, GetCreditCardsInput, UpdateCreditCardInput } from '../schemas/credit-cards.schema';

export interface CreditCardWithUsage extends CreditCard {
  currentInvoiceAmount: number;
  pendingAmount: number;
  totalDebt: number;
  usedLimit: number;
  invoiceStartDate: Date;
  invoiceEndDate: Date;
  dueDate: Date;
}

export abstract class CreditCardsRepositoryInterface {
  abstract createCreditCard(data: CreateCreditCardInput): Promise<CreditCard>;

  abstract getCreditCards(filters?: GetCreditCardsInput): Promise<CreditCard[]>;

  abstract getCreditCardsWithUsage(filters?: GetCreditCardsInput): Promise<CreditCardWithUsage[]>;

  abstract getCreditCardById(id: string): Promise<CreditCard | null>;

  abstract updateCreditCard(id: string, data: UpdateCreditCardInput): Promise<CreditCard>;

  abstract deleteCreditCard(id: string): Promise<void>;

  abstract updateAvailableLimit(id: string, amount: number): Promise<CreditCard>;

  abstract getCreditCardSummary(id: string): Promise<{
    creditCard: CreditCard;
    currentDebt: number;
    availableLimit: number;
    nextClosingDate: Date;
    nextDueDate: Date;
  }>;
}