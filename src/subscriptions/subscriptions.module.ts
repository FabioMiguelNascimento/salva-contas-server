import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "src/prisma/prisma.module";
import SubscriptionSchedulerService from "./subscription-scheduler.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsRepositoryInterface } from "./subscriptions.interface";
import SubscriptionsRepository from "./subscriptions.repository";
import { CancelSubscriptionUseCase } from "./use-cases/cancel-subscription.use-case";
import CreateSubscriptionUseCase from "./use-cases/create-subscription.use-case";
import GetAllSubscriptionsUseCase from "./use-cases/get-all-subscriptions.use-case";
import { UpdateSubscriptionUseCase } from "./use-cases/update-subscription.use-case";

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionSchedulerService,
    CreateSubscriptionUseCase,
    GetAllSubscriptionsUseCase,
    UpdateSubscriptionUseCase,
    CancelSubscriptionUseCase,
    {
      provide: SubscriptionsRepositoryInterface,
      useClass: SubscriptionsRepository
    }
  ]
})
export class SubscriptionsModule {}