import { Subscription } from 'generated/prisma/client';
import {
  CreateSubscriptionInput,
  GetAllSubscriptionsInput,
  UpdateSubscriptionInput,
} from 'src/schemas/subscriptions.schema';

export interface SubscriptionMetrics {
  totalMonthly: number;
  activeCount: number;
  upcomingTotal: number;
  byFrequency: {
    weekly: number;
    monthly: number;
    yearly: number;
  };
}

export abstract class SubscriptionsRepositoryInterface {
  abstract createSubscription(
    data: CreateSubscriptionInput,
  ): Promise<Subscription>;
  abstract getAllSubscriptions(
    filters?: GetAllSubscriptionsInput,
  ): Promise<Subscription[]>;
  abstract updateSubscription(
    id: string,
    data: UpdateSubscriptionInput,
  ): Promise<Subscription>;
  abstract cancelSubscription(id: string): Promise<Subscription>;
  abstract createRecurringTransactions(): Promise<void>;
  abstract getMetrics(): Promise<SubscriptionMetrics>;
}
