import { Injectable } from '@nestjs/common';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class GetCreditCardSummaryUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(id: string) {
    return this.creditCardsRepository.getCreditCardSummary(id);
  }
}