import { Injectable } from '@nestjs/common';
import { CreditCard } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardInput, GetCreditCardsInput, UpdateCreditCardInput } from '../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface, CreditCardWithUsage } from './credit-cards.interface';

@Injectable()
export class CreditCardsRepository implements CreditCardsRepositoryInterface {
  private readonly DEV_USER_ID = '00000000-0000-0000-0000-000000000000';

  constructor(private readonly prisma: PrismaService) {}

  async createCreditCard(data: CreateCreditCardInput): Promise<CreditCard> {
    return this.prisma.creditCard.create({
      data: {
        ...data,
        userId: this.DEV_USER_ID,
        availableLimit: data.limit, // Inicialmente o limite disponível é igual ao limite total
      },
    });
  }

  async getCreditCards(filters?: GetCreditCardsInput): Promise<CreditCard[]> {
    const where: any = { userId: this.DEV_USER_ID };

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.creditCard.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: filters ? (filters.page - 1) * filters.limit : 0,
      take: filters?.limit,
    });
  }

  async getCreditCardsWithUsage(filters?: GetCreditCardsInput): Promise<CreditCardWithUsage[]> {
    const creditCards = await this.getCreditCards(filters);
    
    const result: CreditCardWithUsage[] = [];
    
    for (const card of creditCards) {
      const { invoiceStartDate, invoiceEndDate, dueDate } = this.calculateInvoiceDates(card.closingDay, card.dueDay);
      
      // Transações do ciclo atual (entre início e fechamento da fatura)
      const currentInvoiceResult = await this.prisma.transaction.aggregate({
        where: {
          userId: this.DEV_USER_ID,
          creditCardId: card.id,
          type: 'expense',
          paymentDate: {
            gte: invoiceStartDate,
            lte: invoiceEndDate,
          },
        },
        _sum: { amount: true },
      });

      // Transações pendentes de ciclos anteriores (não pagas)
      const pendingResult = await this.prisma.transaction.aggregate({
        where: {
          userId: this.DEV_USER_ID,
          creditCardId: card.id,
          type: 'expense',
          status: 'pending',
          paymentDate: {
            lt: invoiceStartDate,
          },
        },
        _sum: { amount: true },
      });

      const currentInvoiceAmount = Number(currentInvoiceResult._sum.amount || 0);
      const pendingAmount = Number(pendingResult._sum.amount || 0);
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
      // Estamos no ciclo atual (ainda não fechou)
      invoiceEndDate = new Date(currentYear, currentMonth, closingDay, 23, 59, 59);
      invoiceStartDate = new Date(currentYear, currentMonth - 1, closingDay + 1, 0, 0, 0);
      
      // Vencimento é no mesmo mês do fechamento, mas no dia de vencimento
      if (dueDayOfMonth > closingDay) {
        dueDate = new Date(currentYear, currentMonth, dueDayOfMonth);
      } else {
        // Vencimento é no mês seguinte
        dueDate = new Date(currentYear, currentMonth + 1, dueDayOfMonth);
      }
    } else {
      // Já fechou, estamos no próximo ciclo
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
        userId: this.DEV_USER_ID,
      },
    });
  }

  async updateCreditCard(id: string, data: UpdateCreditCardInput): Promise<CreditCard> {
    return this.prisma.creditCard.update({
      where: {
        id,
        userId: this.DEV_USER_ID,
      },
      data,
    });
  }

  async deleteCreditCard(id: string): Promise<void> {
    await this.prisma.creditCard.delete({
      where: {
        id,
        userId: this.DEV_USER_ID,
      },
    });
  }

  async updateAvailableLimit(id: string, amount: number): Promise<CreditCard> {
    return this.prisma.creditCard.update({
      where: {
        id,
        userId: this.DEV_USER_ID,
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
        userId: this.DEV_USER_ID,
      },
    });

    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Calcular dívida atual (transações pendentes do cartão)
    const currentDebtResult = await this.prisma.transaction.aggregate({
      where: {
        userId: this.DEV_USER_ID,
        creditCardId: id,
        status: 'pending',
      },
      _sum: {
        amount: true,
      },
    });

    const currentDebt = Number(currentDebtResult._sum.amount || 0);

    // Calcular próximas datas de fechamento e vencimento
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // Janeiro = 1

    let nextClosingDate: Date;
    let nextDueDate: Date;

    if (now.getDate() <= creditCard.closingDay) {
      // Ainda não fechou este mês
      nextClosingDate = new Date(currentYear, currentMonth - 1, creditCard.closingDay);
      nextDueDate = new Date(currentYear, currentMonth - 1, creditCard.dueDay);
    } else {
      // Já fechou este mês, próximo fechamento é no próximo mês
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