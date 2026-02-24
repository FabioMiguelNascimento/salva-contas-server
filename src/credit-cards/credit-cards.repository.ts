import { Injectable, Scope } from '@nestjs/common';
import { CreditCard, Prisma } from '../../generated/prisma/client';
import { UserContext } from '../auth/user-context.service';
import { WorkspaceContext } from '../auth/workspace-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardInput, GetCreditCardsInput, UpdateCreditCardInput } from '../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface, CreditCardWithUsage } from './credit-cards.interface';

@Injectable({ scope: Scope.REQUEST })
export class CreditCardsRepository implements CreditCardsRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
    private readonly workspaceContext: WorkspaceContext,
  ) {}

  private get workspaceId(): string {
    return this.workspaceContext.workspaceId;
  }

  private get userId(): string {
    return this.userContext.userId;
  }

  async createCreditCard(data: CreateCreditCardInput): Promise<CreditCard> {
    return this.prisma.creditCard.create({
      data: {
        ...data,
        workspaceId: this.workspaceId,
        createdById: this.userId,
        availableLimit: data.limit,
      },
    });
  }

  async getCreditCards(filters?: GetCreditCardsInput): Promise<CreditCard[]> {
    const where: any = { workspaceId: this.workspaceId };

    if (filters?.status) {
      where.status = filters.status;
    }

    const cards = await this.prisma.creditCard.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: filters ? (filters.page - 1) * filters.limit : 0,
      take: filters?.limit,
    });

    await Promise.all(
      cards.map(async (card) => {
        // Transactions without splits (legacy / direct creditCardId)
        const txAgg = await this.prisma.transaction.aggregate({
          where: {
            workspaceId: this.workspaceId,
            creditCardId: card.id,
            type: 'expense',
            splits: { none: {} },
          },
          _sum: { amount: true },
        });
        // Split rows pointing to this card
        const splitAgg = await this.prisma.transactionSplit.aggregate({
          where: {
            creditCardId: card.id,
            transaction: { workspaceId: this.workspaceId, type: 'expense' },
          },
          _sum: { amount: true },
        });
        const debt = Number(txAgg._sum.amount || 0) + Number(splitAgg._sum.amount || 0);
        card.availableLimit = new Prisma.Decimal(Number(card.limit) - debt);
      })
    );

    return cards;
  }

  async getCreditCardsWithUsage(filters?: GetCreditCardsInput): Promise<CreditCardWithUsage[]> {
    const creditCards = await this.getCreditCards(filters);
    
    const result: CreditCardWithUsage[] = [];
    
    for (const card of creditCards) {
      const { invoiceStartDate, invoiceEndDate, dueDate } = this.calculateInvoiceDates(card.closingDay, card.dueDay);
      
      const currentInvoiceResult = await this.prisma.transaction.aggregate({
        where: {
          workspaceId: this.workspaceId,
          creditCardId: card.id,
          type: 'expense',
          paymentDate: {
            gte: invoiceStartDate,
            lte: invoiceEndDate,
          },
        },
        _sum: { amount: true },
      });

      const pendingResult = await this.prisma.transaction.aggregate({
        where: {
          workspaceId: this.workspaceId,
          creditCardId: card.id,
          type: 'expense',
          status: 'pending',
          paymentDate: {
            lt: invoiceStartDate,
          },
        },
        _sum: { amount: true },
      });

      const currentInvoiceAmount = Number(currentInvoiceResult._sum?.amount || 0);
      const pendingAmount = Number(pendingResult._sum?.amount || 0);
      const totalDebt = currentInvoiceAmount + pendingAmount;
      const usedLimit = totalDebt;

      result.push({
        ...card,
        currentInvoiceAmount,
        pendingAmount,
        totalDebt,
        usedLimit,
        invoiceStartDate,
        invoiceEndDate,
        dueDate,
      });
    }

    return result;
  }

  private calculateInvoiceDates(closingDay: number, dueDayOfMonth: number): { 
    invoiceStartDate: Date; 
    invoiceEndDate: Date; 
    dueDate: Date; 
  } {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let invoiceEndDate: Date;
    let invoiceStartDate: Date;
    let dueDate: Date;

    if (currentDay <= closingDay) {
      invoiceEndDate = new Date(currentYear, currentMonth, closingDay, 23, 59, 59);
      invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay + 1, 0, 0, 0);
      
      if (dueDayOfMonth > closingDay) {
        dueDate = new Date(currentYear, currentMonth, dueDayOfMonth);
      } else {
        dueDate = new Date(currentYear, currentMonth + 1, dueDayOfMonth);
      }
    } else {
      invoiceEndDate = new Date(currentYear, currentMonth + 1, closingDay, 23, 59, 59);
      invoiceStartDate = new Date(currentYear, currentMonth, closingDay + 1, 0, 0, 0);
      
      if (dueDayOfMonth > closingDay) {
        dueDate = new Date(currentYear, currentMonth + 1, dueDayOfMonth);
      } else {
        dueDate = new Date(currentYear, currentMonth + 2, dueDayOfMonth);
      }
    }

    return { invoiceStartDate, invoiceEndDate, dueDate };
  }

  async getCreditCardById(id: string): Promise<CreditCard | null> {
    return this.prisma.creditCard.findFirst({
      where: {
        id,
        workspaceId: this.workspaceId,
      },
    });
  }

  async updateCreditCard(id: string, data: UpdateCreditCardInput): Promise<CreditCard> {
    return this.prisma.creditCard.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteCreditCard(id: string): Promise<void> {
    await this.prisma.creditCard.delete({
      where: {
        id,
      },
    });
  }

  async updateAvailableLimit(id: string, amount: number): Promise<CreditCard> {
    return this.prisma.creditCard.update({
      where: {
        id,
      },
      data: {
        availableLimit: amount,
      },
    });
  }

  async getCreditCardSummary(id: string): Promise<{
    creditCard: CreditCard;
    currentDebt: number;
    availableLimit: number;
    nextClosingDate: Date;
    nextDueDate: Date;
  }> {
    const creditCard = await this.prisma.creditCard.findFirst({
      where: {
        id,
        workspaceId: this.workspaceId,
      },
    });

    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    const currentDebtResult = await this.prisma.transaction.aggregate({
      where: {
        workspaceId: this.workspaceId,
        creditCardId: id,
        status: 'pending',
      },
      _sum: {
        amount: true,
      },
    });

    const currentDebt = Number(currentDebtResult._sum?.amount || 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let nextClosingDate: Date;
    let nextDueDate: Date;

    if (now.getDate() <= creditCard.closingDay) {
      nextClosingDate = new Date(currentYear, currentMonth - 1, creditCard.closingDay);
      nextDueDate = new Date(currentYear, currentMonth - 1, creditCard.dueDay);
    } else {
      nextClosingDate = new Date(currentYear, currentMonth, creditCard.closingDay);
      nextDueDate = new Date(currentYear, currentMonth, creditCard.dueDay);
    }

    return {
      creditCard,
      currentDebt,
      availableLimit: Number(creditCard.availableLimit),
      nextClosingDate,
      nextDueDate,
    };
  }
}
