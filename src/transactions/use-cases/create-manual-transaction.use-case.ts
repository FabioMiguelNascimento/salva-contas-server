import { Inject, Injectable } from '@nestjs/common';
import { CreateTransactionInput } from 'src/schemas/transactions.schema';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export default class CreateManualTransactionUseCase {
    constructor(
        @Inject(TransactionsRepositoryInterface)
        private readonly transactionsRepository: TransactionsRepositoryInterface,
    ) {}

    async execute(data: CreateTransactionInput) {
        return this.transactionsRepository.createManualTransaction(data);
    }
}