import { Injectable } from '@nestjs/common';
import type { CreditCard } from '../../../generated/prisma/client';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class GetCreditCardByIdUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(id: string): Promise<CreditCard | null> {
    return this.creditCardsRepository.getCreditCardById(id);
  }
}