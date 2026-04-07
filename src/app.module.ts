import { Module } from '@nestjs/common';
import { IdempotencyModule } from './idempotency/idempotency.module';
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
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsageModule } from './usage/usage.module';
import { VaultsModule } from './vaults/vaults.module';

@Module({
  imports: [
    IdempotencyModule,
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
    ReportsModule,
    CreditCardsModule,
    DebitCardsModule,
    VaultsModule,
  ],
})
export class AppModule {}
