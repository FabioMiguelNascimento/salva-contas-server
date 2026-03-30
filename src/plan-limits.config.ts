import { PlanTier } from 'generated/prisma/enums';

export const PLAN_LIMITS = {
  [PlanTier.FREE]: {
    maxUsers: 1,
    historyMonths: 3,
    maxVaults: 0,
    reportsTier: 'SIMPLE',
    canExport: false,
    aiModel: 'BASIC',
    maxAiMessagesPerMonth: 5,
    maxReceiptsPerMonth: 0,
    canUseAudit: false,
    supportTier: 'EMAIL',
  },
  [PlanTier.PRO]: {
    maxUsers: 1,
    historyMonths: Infinity,
    maxVaults: Infinity,
    reportsTier: 'DETAILED',
    canExport: true,
    aiModel: 'ADVANCED',
    maxAiMessagesPerMonth: 50,
    maxReceiptsPerMonth: 30,
    canUseAudit: false,
    supportTier: 'PRIORITY',
  },
  [PlanTier.FAMILY]: {
    maxUsers: 5,
    historyMonths: Infinity,
    maxVaults: Infinity,
    reportsTier: 'CONSOLIDATED',
    canExport: true,
    aiModel: 'ADVANCED',
    maxAiMessagesPerMonth: 200,
    maxReceiptsPerMonth: 100,
    canUseAudit: true,
    supportTier: 'VIP',
  },
} as const;

export type PlanLimits = typeof PLAN_LIMITS;
