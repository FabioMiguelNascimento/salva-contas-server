import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionsRepositoryInterface } from '../subscriptions.interface';

@Injectable()
export default class GetAllSubscriptionsUseCase {
    constructor(
        @Inject(SubscriptionsRepositoryInterface)
        private readonly subscriptionsRepository: SubscriptionsRepositoryInterface,
    ) {}

    async execute() {
        return this.subscriptionsRepository.getAllSubscriptions();
    }
}