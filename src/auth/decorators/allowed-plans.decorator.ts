import { SetMetadata } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';

export const ALLOWED_PLANS_KEY = 'allowed_plans';
export const AllowedPlans = (...plans: PlanTier[]) =>
  SetMetadata(ALLOWED_PLANS_KEY, plans);
