import { Module, Global } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsageService } from './usage.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
