import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyCleanupCron {
  private readonly logger = new Logger(IdempotencyCleanupCron.name);

  constructor(private readonly idempotencyService: IdempotencyService) {}

  @Cron('0 * * * *') // every hour
  async handleCleanup() {
    const count = await this.idempotencyService.cleanup();
    if (count > 0) {
      this.logger.debug(`Limpeza de idempotência: ${count} registros expirados removidos`);
    }
  }
}
