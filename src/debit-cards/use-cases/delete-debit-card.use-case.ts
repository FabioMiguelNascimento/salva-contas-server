import { Injectable, NotFoundException } from '@nestjs/common';
import { DebitCardsRepositoryInterface } from '../debit-cards.interface';

@Injectable()
export class DeleteDebitCardUseCase {
  constructor(private readonly debitCardsRepository: DebitCardsRepositoryInterface) {}

  async execute(id: string): Promise<void> {
    try {
      await this.debitCardsRepository.deleteDebitCard(id);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Debit card not found');
      }
      throw error;
    }
  }
}
