import { Injectable } from '@nestjs/common';
import { DebitCardsRepositoryInterface } from '../debit-cards.interface';

@Injectable()
export class GetDebitCardMetricsUseCase {
  constructor(
    private readonly debitCardsRepository: DebitCardsRepositoryInterface,
  ) {}

  async execute() {
    return this.debitCardsRepository.getMetrics();
  }
}
