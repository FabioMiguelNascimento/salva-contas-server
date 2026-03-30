import { PLAN_LIMITS as EXTERNAL_PLAN_LIMITS } from 'src/config/plan-limits.config';

export const PLAN_LIMITS = EXTERNAL_PLAN_LIMITS;

export type PlanLimits = typeof PLAN_LIMITS;
