import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { PLAN_LIMITS } from '../usage.constants';
import { UsageRepositoryInterface } from '../usage.interface';

export type FeatureType = 'IA' | 'RECEIPT';

@Injectable()
export class IncrementUsageUseCase {
  private readonly logger = new Logger(IncrementUsageUseCase.name);

  constructor(
    @Inject(UsageRepositoryInterface)
    private readonly usageRepository: UsageRepositoryInterface,
  ) {}

  async execute(userId: string, planTier: PlanTier, feature: FeatureType) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let usage = await this.usageRepository.findByUserId(userId);

    // Lazy Reset
    if (!usage || usage.month !== currentMonth || usage.year !== currentYear) {
      usage = await this.usageRepository.upsertUsage(
        userId,
        currentMonth,
        currentYear,
      );
    }

    const planLimits = PLAN_LIMITS[planTier];
    const currentCount =
      feature === 'IA' ? usage.aiInteractionsCount : usage.receiptsCount;
    const limit =
      feature === 'IA'
        ? planLimits.maxAiMessagesPerMonth
        : planLimits.maxReceiptsPerMonth;

    if (currentCount >= limit) {
      this.logger.warn(`Limite atingido para usuário ${userId}: ${feature}`);
      throw new HttpException(
        {
          code: 'LIMIT_REACHED',
          message: `Você atingiu seu limite mensal de ${feature === 'IA' ? 'interações' : 'leitura de recibos'}.`,
          limit,
          current: currentCount,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const field = feature === 'IA' ? 'aiInteractionsCount' : 'receiptsCount';
    return this.usageRepository.incrementUsage(userId, field);
  }
}
