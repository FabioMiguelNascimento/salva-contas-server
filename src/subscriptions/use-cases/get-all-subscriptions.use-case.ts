import { Inject, Injectable } from '@nestjs/common';
import { GetAllSubscriptionsInput } from 'src/schemas/subscriptions.schema';
import { SubscriptionsRepositoryInterface } from '../subscriptions.interface';

@Injectable()
export default class GetAllSubscriptionsUseCase {
    constructor(
        @Inject(SubscriptionsRepositoryInterface)
        private readonly subscriptionsRepository: SubscriptionsRepositoryInterface,
    ) {}

    async execute(filters?: GetAllSubscriptionsInput) {
        return this.subscriptionsRepository.getAllSubscriptions(filters);
    }
}