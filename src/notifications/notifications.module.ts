import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepositoryInterface } from './notifications.interface';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationUseCase } from './use-cases/create-notification.use-case';
import { DeleteNotificationUseCase } from './use-cases/delete-notification.use-case';
import { GenerateNotificationsUseCase } from './use-cases/generate-notifications.use-case';
import { GetNotificationsUseCase } from './use-cases/get-notifications.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count.use-case';
import { MarkAllAsReadUseCase } from './use-cases/mark-all-as-read.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [
    NotificationSchedulerService,
    {
      provide: NotificationsRepositoryInterface,
      useClass: NotificationsRepository,
    },
    CreateNotificationUseCase,
    GetNotificationsUseCase,
    MarkAsReadUseCase,
    MarkAllAsReadUseCase,
    DeleteNotificationUseCase,
    GetUnreadCountUseCase,
    GenerateNotificationsUseCase,
  ],
  exports: [GenerateNotificationsUseCase],
})
export class NotificationsModule {}