import { z } from 'zod';

export const getDashboardMetricsResponseSchema = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  netBalance: z.number(),
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      income: z.number(),
      expenses: z.number(),
      net: z.number(),
    }),
  ),
});

export type GetDashboardMetricsResponse = z.infer<typeof getDashboardMetricsResponseSchema>;

export const getDashboardMetricsSchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).max(2100).optional(),
});

export type GetDashboardMetricsDto = z.infer<typeof getDashboardMetricsSchema>;
