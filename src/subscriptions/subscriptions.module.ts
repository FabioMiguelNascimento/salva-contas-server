import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "src/prisma/prisma.module";
import { SubscriptionsController } from "./subscriptions.controller";
import SubscriptionSchedulerService from "./subscription-scheduler.service";
import CreateSubscriptionUseCase from "./use-cases/create-subscription.use-case";
import GetAllSubscriptionsUseCase from "./use-cases/get-all-subscriptions.use-case";
import { SubscriptionsRepositoryInterface } from "./subscriptions.interface";
import SubscriptionsRepository from "./subscriptions.repository";
import {Module} from "@nestjs/common";

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionSchedulerService,
    CreateSubscriptionUseCase,
    GetAllSubscriptionsUseCase,
    {
      provide: SubscriptionsRepositoryInterface,
      useClass: SubscriptionsRepository
    }
  ]
})
export class SubscriptionsModule {}