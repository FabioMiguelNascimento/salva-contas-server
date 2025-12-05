import { Injectable, NotFoundException } from '@nestjs/common';
import { Subscription } from 'generated/prisma/client';
import { SubscriptionsRepositoryInterface } from '../subscriptions.interface';

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(private readonly subscriptionsRepository: SubscriptionsRepositoryInterface) {}

  async execute(id: string): Promise<Subscription> {
    try {
      return await this.subscriptionsRepository.cancelSubscription(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Subscription not found');
      }
      throw error;
    }
  }
}