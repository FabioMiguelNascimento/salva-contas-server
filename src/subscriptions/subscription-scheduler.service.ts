import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsRepositoryInterface } from './subscriptions.interface';

@Injectable()
export default class SubscriptionSchedulerService {
    constructor(
        @Inject(SubscriptionsRepositoryInterface)
        private readonly subscriptionsRepository: SubscriptionsRepositoryInterface,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleRecurringSubscriptions() {
        await this.subscriptionsRepository.createRecurringTransactions();
    }
}