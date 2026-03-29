import { Inject, Injectable } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { UsageRepositoryInterface } from '../usage.interface';
import { PLAN_LIMITS } from '../usage.constants';

@Injectable()
export class GetUsageUseCase {
  constructor(
    @Inject(UsageRepositoryInterface)
    private readonly usageRepository: UsageRepositoryInterface,
  ) {}

  async execute(userId: string, planTier: PlanTier) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    let usage = await this.usageRepository.findByUserId(userId);

    if (!usage || usage.month !== currentMonth || usage.year !== currentYear) {
      usage = await this.usageRepository.upsertUsage(userId, currentMonth, currentYear);
    }

    const planLimits = PLAN_LIMITS[planTier];

    return {
      usage: {
        aiInteractions: usage.aiInteractionsCount,
        receipts: usage.receiptsCount,
      },
      limits: {
        aiInteractions: planLimits.IA,
        receipts: planLimits.RECEIPT,
      },
      period: {
        month: currentMonth,
        year: currentYear,
      },
    };
  }
}
