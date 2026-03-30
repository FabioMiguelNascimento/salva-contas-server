import { PlanTier } from 'generated/prisma/enums';

export type ReportsTier = 'SIMPLE' | 'DETAILED' | 'CONSOLIDATED';
export type SupportTier = 'EMAIL' | 'PRIORITY' | 'VIP';
export type AiModelTier = 'BASIC' | 'ADVANCED';

export const PLAN_LIMITS = {
  [PlanTier.FREE]: {
    maxUsers: 1,
    historyMonths: 3,
    maxVaults: 0,
    reportsTier: 'SIMPLE' as ReportsTier,
    canExport: false,
    aiModel: 'BASIC' as AiModelTier,
    maxAiMessagesPerMonth: 5,
    maxReceiptsPerMonth: 0,
    canUseAudit: false,
    supportTier: 'EMAIL' as SupportTier,
  },
  [PlanTier.PRO]: {
    maxUsers: 1,
    historyMonths: Infinity,
    maxVaults: Infinity,
    reportsTier: 'DETAILED' as ReportsTier,
    canExport: true,
    aiModel: 'ADVANCED' as AiModelTier,
    maxAiMessagesPerMonth: 50,
    maxReceiptsPerMonth: 30,
    canUseAudit: false,
    supportTier: 'PRIORITY' as SupportTier,
  },
  [PlanTier.FAMILY]: {
    maxUsers: 5,
    historyMonths: Infinity,
    maxVaults: Infinity,
    reportsTier: 'CONSOLIDATED' as ReportsTier,
    canExport: true,
    aiModel: 'ADVANCED' as AiModelTier,
    maxAiMessagesPerMonth: 200,
    maxReceiptsPerMonth: 100,
    canUseAudit: true,
    supportTier: 'VIP' as SupportTier,
  },
} as const;

export type PlanLimits = typeof PLAN_LIMITS;
