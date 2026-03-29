import { SubscriptionUsage } from 'generated/prisma/client';

export abstract class UsageRepositoryInterface {
  abstract findByUserId(userId: string): Promise<SubscriptionUsage | null>;
  abstract upsertUsage(
    userId: string,
    month: number,
    year: number,
  ): Promise<SubscriptionUsage>;
  abstract incrementUsage(
    userId: string,
    feature: 'aiInteractionsCount' | 'receiptsCount',
  ): Promise<SubscriptionUsage>;
}
