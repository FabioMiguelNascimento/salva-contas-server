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
    const cardIdsToRecalc = new Set<string>();

    for (const entry of dataList) {
      const existing =
        await this.transactionsRepository.findDuplicateTransaction(entry);

      if (existing) {
        created.push(existing);
        continue;
      }

      const createdTx =
        await this.transactionsRepository.createTransaction(entry, {
          skipCardRecalc: true,
        });
      created.push(createdTx);

      const splits = (entry as any)?.splits as
        | Array<{ creditCardId?: string | null }>
        | undefined;

      if (splits && splits.length > 0) {
        for (const split of splits) {
          if (split?.creditCardId) {
            cardIdsToRecalc.add(split.creditCardId);
          }
        }
      } else if ((entry as any)?.creditCardId) {
        cardIdsToRecalc.add((entry as any).creditCardId as string);
      }
    }

    if (cardIdsToRecalc.size > 0) {
      await this.transactionsRepository.recalcCardLimits([
        ...cardIdsToRecalc,
      ]);
    }

    return created.length === 1 ? created[0] : created;
  }
}
