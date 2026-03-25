import { Injectable } from '@nestjs/common';
import { SubscriptionsRepositoryInterface } from '../subscriptions.interface';

@Injectable()
export class GetSubscriptionMetricsUseCase {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepositoryInterface,
  ) {}

  async execute() {
    return this.subscriptionsRepository.getMetrics();
  }
}
