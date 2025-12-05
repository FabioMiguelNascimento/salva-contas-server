import { Injectable } from '@nestjs/common';
import type { CreditCard } from '../../../generated/prisma/client';
import { CreateCreditCardInput } from '../../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class CreateCreditCardUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(data: CreateCreditCardInput): Promise<CreditCard> {
    return this.creditCardsRepository.createCreditCard(data);
  }
}