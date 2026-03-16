import { Injectable, NotFoundException } from '@nestjs/common';
import { DebitCard } from 'generated/prisma/client';
import { UpdateDebitCardInput } from 'src/schemas/debit-cards.schema';
import { DebitCardsRepositoryInterface } from '../debit-cards.interface';

@Injectable()
export class UpdateDebitCardUseCase {
  constructor(private readonly debitCardsRepository: DebitCardsRepositoryInterface) {}

  async execute(id: string, data: UpdateDebitCardInput): Promise<DebitCard> {
    try {
      return await this.debitCardsRepository.updateDebitCard(id, data);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Debit card not found');
      }
      throw error;
    }
  }
}
