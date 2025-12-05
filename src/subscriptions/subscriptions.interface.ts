import { Subscription } from "generated/prisma/client";
import { CreateSubscriptionInput, GetAllSubscriptionsInput } from "src/schemas/subscriptions.schema";

export abstract class SubscriptionsRepositoryInterface {
    abstract createSubscription(data: CreateSubscriptionInput): Promise<Subscription>;
    abstract getAllSubscriptions(filters?: GetAllSubscriptionsInput): Promise<Subscription[]>;
    abstract createRecurringTransactions(): Promise<void>;
}