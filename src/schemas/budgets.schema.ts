import { z } from 'zod';

export const CreateBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
});

export const UpdateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
});

export const GetBudgetsSchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2000).max(2100).optional(),
});

export const GetBudgetProgressSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2000).max(2100),
});

export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type GetBudgetsInput = z.infer<typeof GetBudgetsSchema>;
export type GetBudgetProgressInput = z.infer<typeof GetBudgetProgressSchema>;