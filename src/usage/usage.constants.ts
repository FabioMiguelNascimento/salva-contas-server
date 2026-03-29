import { PlanTier } from 'generated/prisma/enums';

export const PLAN_LIMITS = {
  [PlanTier.FREE]: {
    IA: 0,
    RECEIPT: 0,
  },
  [PlanTier.PRO]: {
    IA: 50,
    RECEIPT: 30,
  },
  [PlanTier.FAMILY]: {
    IA: 200,
    RECEIPT: 100,
  },
} as const;

export type PlanLimits = typeof PLAN_LIMITS;
