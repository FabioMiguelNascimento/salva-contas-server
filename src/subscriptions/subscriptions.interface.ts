import { Subscription } from "generated/prisma/client";
import { CreateSubscriptionInput } from "src/schemas/subscriptions.schema";

export abstract class SubscriptionsRepositoryInterface {
    abstract createSubscription(data: CreateSubscriptionInput): Promise<Subscription>;
    abstract getAllSubscriptions(): Promise<Subscription[]>;
    abstract createRecurringTransactions(): Promise<void>;
}