import { Injectable } from '@nestjs/common';
import { DebitCard } from 'generated/prisma/client';
import { GetDebitCardsInput } from 'src/schemas/debit-cards.schema';
import { DebitCardsRepositoryInterface } from '../debit-cards.interface';

@Injectable()
export class GetDebitCardsUseCase {
  constructor(private readonly debitCardsRepository: DebitCardsRepositoryInterface) {}

  async execute(filters?: GetDebitCardsInput): Promise<DebitCard[]> {
    return this.debitCardsRepository.getDebitCards(filters);
  }
}
