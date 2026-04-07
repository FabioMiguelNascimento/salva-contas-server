import { Global, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from 'src/prisma/prisma.module';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyCleanupCron } from './idempotency-cleanup.cron';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Global()
@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  providers: [
    IdempotencyRepository,
    IdempotencyService,
    IdempotencyCleanupCron,
    IdempotencyInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
