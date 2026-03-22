import { Inject, Injectable } from '@nestjs/common';
import { AIReceiptData } from 'src/schemas/transactions.schema';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export class ConfirmTransactionUseCase {
  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
  ) {}

  async execute(transactionOrList: AIReceiptData | AIReceiptData[]) {
    const dataList = Array.isArray(transactionOrList)
      ? transactionOrList
      : [transactionOrList];

    const created: Array<
      import('../transactions.interface').TransactionWithCount
    > = [];
    for (const entry of dataList) {
      const createdTx =
        await this.transactionsRepository.createTransaction(entry);
      created.push(createdTx);
    }

    return created.length === 1 ? created[0] : created;
  }
}
