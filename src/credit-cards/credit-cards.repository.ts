import { Injectable } from '@nestjs/common';
import { CreditCard } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreditCardInput, GetCreditCardsInput, UpdateCreditCardInput } from '../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface } from './credit-cards.interface';

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