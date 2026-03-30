import { Module } from '@nestjs/common';
import { AiAdvisorModule } from './ai-advisor/ai-advisor.module';
import { AuthModule } from './auth/auth.module';
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DebitCardsModule } from './debit-cards/debit-cards.module';
import { HealthModule } from './health/health.module';
import { InvitesModule } from './invites/invites.module';
import { MercadoPagoModule } from './mercado-pago/mercado-pago.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TransactionsModule } from './transactions/transactions.module';
import { VaultsModule } from './vaults/vaults.module';
import { UsageModule } from './usage/usage.module';

@Module({
  imports: [
    UsageModule,
    StorageModule,
    AiAdvisorModule,
    AuthModule,
    HealthModule,
    InvitesModule,
    MercadoPagoModule,
    TransactionsModule,
    CategoriesModule,
    SubscriptionsModule,
    DashboardModule,
    BudgetsModule,
    NotificationsModule,
    CreditCardsModule,
    DebitCardsModule,
    VaultsModule,
  ],
})
export class AppModule {}
