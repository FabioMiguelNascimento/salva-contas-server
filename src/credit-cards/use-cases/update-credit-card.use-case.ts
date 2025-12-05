import { Injectable } from '@nestjs/common';
import type { CreditCard } from '../../../generated/prisma/client';
import { UpdateCreditCardInput } from '../../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class UpdateCreditCardUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(id: string, data: UpdateCreditCardInput): Promise<CreditCard> {
    return this.creditCardsRepository.updateCreditCard(id, data);
  }
}