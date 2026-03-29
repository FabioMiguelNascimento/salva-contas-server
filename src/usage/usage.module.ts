import { Module, Global } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageRepository } from './usage.repository';
import { UsageRepositoryInterface } from './usage.interface';
import { GetUsageUseCase } from './use-cases/get-usage.use-case';
import { IncrementUsageUseCase } from './use-cases/increment-usage.use-case';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [UsageController],
  providers: [
    UsageService,
    GetUsageUseCase,
    IncrementUsageUseCase,
    {
      provide: UsageRepositoryInterface,
      useClass: UsageRepository,
    },
  ],
  exports: [UsageService, GetUsageUseCase, IncrementUsageUseCase],
})
export class UsageModule {}
