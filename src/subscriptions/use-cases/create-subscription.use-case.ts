import { Inject, Injectable } from '@nestjs/common';
import { CreateSubscriptionInput } from 'src/schemas/subscriptions.schema';
import { SubscriptionsRepositoryInterface } from '../subscriptions.interface';

@Injectable()
export default class CreateSubscriptionUseCase {
    constructor(
        @Inject(SubscriptionsRepositoryInterface)
        private readonly subscriptionsRepository: SubscriptionsRepositoryInterface,
    ) {}

    async execute(data: CreateSubscriptionInput) {
        return this.subscriptionsRepository.createSubscription(data);
    }
}