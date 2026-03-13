import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    private readonly storageService: StorageService,
  ) {}

  async execute(id: string): Promise<void> {
    try {
      const { attachmentKey } = await this.transactionsRepository.deleteTransaction(id);
      if (attachmentKey) {
        await this.storageService.deleteFile(attachmentKey);
      }
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Transaction not found');
      }
      throw error;
    }
  }
}