import { Inject, Injectable } from '@nestjs/common';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export class GetInstallmentTransactionsUseCase {
  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
  ) {}

  async execute(transactionId: string) {
    const tx = await this.transactionsRepository.getTransactionById(transactionId);
    if (!tx || !tx.installmentGroupId) {
      return [];
    }

    return this.transactionsRepository.getInstallmentTransactions(tx.installmentGroupId);
  }
}
