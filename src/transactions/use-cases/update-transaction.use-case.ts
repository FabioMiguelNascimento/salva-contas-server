import { Injectable, NotFoundException } from '@nestjs/common';
import { Transaction } from 'generated/prisma/client';
import { UpdateTransactionInput } from 'src/schemas/transactions.schema';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(private readonly transactionsRepository: TransactionsRepositoryInterface) {}

  async execute(id: string, data: UpdateTransactionInput): Promise<Transaction> {
    try {
      return await this.transactionsRepository.updateTransaction(id, data);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Transaction not found');
      }
      throw error;
    }
  }
}