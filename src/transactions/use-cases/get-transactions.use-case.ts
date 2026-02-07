import { Inject, Injectable } from '@nestjs/common';
import { GetTransactionsInput } from 'src/schemas/transactions.schema';
import { StorageService } from 'src/storage/storage.service';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export default class GetTransactionsUseCase {
    constructor(
        @Inject(TransactionsRepositoryInterface)
        private readonly transactionsRepository: TransactionsRepositoryInterface,
        private readonly storageService: StorageService,
    ) {}

    async execute(filters: GetTransactionsInput) {
        const result = await this.transactionsRepository.getTransactions(filters);
        
        // Gera presigned URLs para os anexos
        const dataWithUrls = await Promise.all(
            result.data.map(async (transaction) => {
                let attachmentUrl: string | null = null;
                
                if (transaction.attachmentKey) {
                    attachmentUrl = await this.storageService.getPresignedUrl(transaction.attachmentKey);
                }
                
                return {
                    ...transaction,
                    attachmentUrl,
                };
            })
        );
        
        return {
            ...result,
            data: dataWithUrls,
        };
    }
}