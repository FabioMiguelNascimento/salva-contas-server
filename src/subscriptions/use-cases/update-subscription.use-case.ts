import { Injectable, NotFoundException } from '@nestjs/common';
import { Subscription } from 'generated/prisma/client';
import { UpdateSubscriptionInput } from 'src/schemas/subscriptions.schema';
import { SubscriptionsRepositoryInterface } from '../subscriptions.interface';

@Injectable()
export class UpdateSubscriptionUseCase {
  constructor(private readonly subscriptionsRepository: SubscriptionsRepositoryInterface) {}

  async execute(id: string, data: UpdateSubscriptionInput): Promise<Subscription> {
    try {
      return await this.subscriptionsRepository.updateSubscription(id, data);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Subscription not found');
      }
      throw error;
    }
  }
}