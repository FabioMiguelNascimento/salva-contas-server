import { Injectable } from '@nestjs/common';
import { DebitCard } from 'generated/prisma/client';
import { CreateDebitCardInput } from 'src/schemas/debit-cards.schema';
import { DebitCardsRepositoryInterface } from '../debit-cards.interface';

@Injectable()
export class CreateDebitCardUseCase {
  constructor(
    private readonly debitCardsRepository: DebitCardsRepositoryInterface,
  ) {}

  async execute(data: CreateDebitCardInput): Promise<DebitCard> {
    return this.debitCardsRepository.createDebitCard(data);
  }
}
