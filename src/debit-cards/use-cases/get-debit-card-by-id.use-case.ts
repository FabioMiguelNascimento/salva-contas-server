import { Injectable } from '@nestjs/common';
import { DebitCard } from 'generated/prisma/client';
import { DebitCardsRepositoryInterface } from '../debit-cards.interface';

@Injectable()
export class GetDebitCardByIdUseCase {
  constructor(
    private readonly debitCardsRepository: DebitCardsRepositoryInterface,
  ) {}

  async execute(id: string): Promise<DebitCard | null> {
    return this.debitCardsRepository.getDebitCardById(id);
  }
}
