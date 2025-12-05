import { Injectable } from '@nestjs/common';
import type { CreditCard } from '../../../generated/prisma/client';
import { GetCreditCardsInput } from '../../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class GetCreditCardsUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(filters?: GetCreditCardsInput): Promise<CreditCard[]> {
    return this.creditCardsRepository.getCreditCards(filters);
  }
}