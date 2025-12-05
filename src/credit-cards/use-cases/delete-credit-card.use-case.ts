import { Injectable } from '@nestjs/common';
import { CreditCardsRepositoryInterface } from '../credit-cards.interface';

@Injectable()
export class DeleteCreditCardUseCase {
  constructor(private readonly creditCardsRepository: CreditCardsRepositoryInterface) {}

  async execute(id: string): Promise<void> {
    return this.creditCardsRepository.deleteCreditCard(id);
  }
}