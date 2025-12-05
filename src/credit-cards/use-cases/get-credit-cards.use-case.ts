import { Injectable } from '@nestjs/common';
import { GetCreditCardsInput } from '../../schemas/credit-cards.schema';
import { CreditCardsRepositoryInterface, CreditCardWithUsage } from '../credit-cards.interface';

@Injectable()
export class GetCreditCardsUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(filters?: GetCreditCardsInput): Promise<CreditCardWithUsage[]> {
    return this.creditCardsRepository.getCreditCardsWithUsage(filters);
  }
}