import { Injectable } from '@nestjs/common';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class GetCreditCardMetricsUseCase {
  constructor(
    private readonly creditCardsRepository: CreditCardsRepositoryInterface,
  ) {}

  async execute() {
    return this.creditCardsRepository.getMetrics();
  }
}
