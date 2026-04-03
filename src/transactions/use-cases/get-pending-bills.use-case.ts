import { Injectable } from '@nestjs/common';
import { GetPendingBillsInput } from 'src/schemas/transactions.schema';
import { StorageService } from 'src/storage/storage.service';
import {
    PendingBillsResponse,
    TransactionsRepositoryInterface,
} from '../transactions.interface';

@Injectable()
export default class GetPendingBillsUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    private readonly storageService: StorageService,
  ) {}

  async execute(filters: GetPendingBillsInput): Promise<PendingBillsResponse> {
    const result = await this.transactionsRepository.getPendingBills(filters);

    const dataWithUrls = await Promise.all(
      result.data.map(async (transaction) => {
        let attachmentUrl: string | null = null;

        if (transaction.attachmentKey) {
          attachmentUrl = await this.storageService.getPresignedUrl(
            transaction.attachmentKey,
          );
        }

        return {
          ...transaction,
          attachmentUrl,
        };
      }),
    );

    return {
      ...result,
      data: dataWithUrls,
    };
  }
}