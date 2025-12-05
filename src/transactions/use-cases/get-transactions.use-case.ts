import { Inject, Injectable } from '@nestjs/common';
import { GetTransactionsInput } from 'src/schemas/transactions.schema';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export default class GetTransactionsUseCase {
    constructor(
        @Inject(TransactionsRepositoryInterface)
        private readonly transactionsRepository: TransactionsRepositoryInterface,
    ) {}

    async execute(filters: GetTransactionsInput) {
        return this.transactionsRepository.getTransactions(filters);
    }
}