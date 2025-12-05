import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export class DeleteTransactionUseCase {
  constructor(private readonly transactionsRepository: TransactionsRepositoryInterface) {}

  async execute(id: string): Promise<void> {
    try {
      await this.transactionsRepository.deleteTransaction(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Transaction not found');
      }
      throw error;
    }
  }
}