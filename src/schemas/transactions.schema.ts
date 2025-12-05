import { z } from 'zod';

export const AIReceiptSchema = z.object({
  amount: z.number().positive(),
  description: z.string(),
  category: z.string(),
  type: z.enum(['expense', 'income']),
  status: z.enum(['paid', 'pending']),
  dueDate: z.coerce.date().nullable(), 
  paymentDate: z.coerce.date().nullable(),
});

export const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  categoryId: z.string().uuid(),
  type: z.enum(['expense', 'income']),
  status: z.enum(['paid', 'pending']),
  dueDate: z.coerce.date().nullable(),
  paymentDate: z.coerce.date().nullable(),
});

export const GetTransactionsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['expense', 'income']).optional(),
  status: z.enum(['paid', 'pending']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
});

export const UpdateTransactionSchema = z.object({
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['expense', 'income']).optional(),
  status: z.enum(['paid', 'pending']).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  paymentDate: z.coerce.date().nullable().optional(),
});

export type AIReceiptData = z.infer<typeof AIReceiptSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type GetTransactionsInput = z.infer<typeof GetTransactionsSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;