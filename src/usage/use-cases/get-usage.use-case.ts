import { Inject, Injectable } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { PLAN_LIMITS } from '../usage.constants';
import { UsageRepositoryInterface } from '../usage.interface';

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
      usage = await this.usageRepository.upsertUsage(
        userId,
        currentMonth,
        currentYear,
      );
    }

    const planLimits = PLAN_LIMITS[planTier];

    const aiLimit = planLimits.maxAiMessagesPerMonth;
    const receiptLimit = planLimits.maxReceiptsPerMonth;

    return {
      usage: {
        aiInteractions: usage.aiInteractionsCount,
        receipts: usage.receiptsCount,
      },
      limits: {
        aiInteractions: aiLimit,
        receipts: receiptLimit,
      },
      period: {
        month: currentMonth,
        year: currentYear,
      },
    };
  }
}
