import { Injectable } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import {
  FeatureType,
  IncrementUsageUseCase,
} from './use-cases/increment-usage.use-case';
import { GetUsageUseCase } from './use-cases/get-usage.use-case';

@Injectable()
export class UsageService {
  constructor(
    private readonly incrementUsageUseCase: IncrementUsageUseCase,
    private readonly getUsageUseCase: GetUsageUseCase,
  ) {}

  async checkAndIncrementUsage(
    userId: string,
    planTier: PlanTier,
    feature: FeatureType,
  ) {
    return this.incrementUsageUseCase.execute(userId, planTier, feature);
  }

  async getUsage(userId: string, planTier: PlanTier) {
    return this.getUsageUseCase.execute(userId, planTier);
  }
}
