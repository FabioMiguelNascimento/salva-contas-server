import { z } from 'zod';

export const PAYMENT_METHODS = ['credit_card', 'debit', 'pix', 'cash', 'transfer', 'other'] as const;
export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export const SplitSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  creditCardId: z.string().uuid().nullable().optional(),
});

export const AISplitSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  creditCardId: z.string().nullable().optional(),
});

export const AIReceiptSchema = z.object({
  amount: z.number().positive(),
  description: z.string(),
  category: z.string(),
  type: z.enum(['expense', 'income']),
  status: z.enum(['paid', 'pending']),
  // AI returns dates as "DD/MM/YYYY" (string). Accept string|null/undefined here and convert later.
  dueDate: z.string().nullable().optional(),
  paymentDate: z.string().nullable().optional(),
  creditCardId: z.string().nullable().optional(),
  // Optional: returned when payment is split across multiple methods
  splits: z.array(AISplitSchema).min(2).optional(),
});

export const CreateTransactionSchema = z
  .object({
    amount: z.number().positive(),
    description: z.string().min(1),
    categoryId: z.string().uuid(),
    type: z.enum(['expense', 'income']),
    status: z.enum(['paid', 'pending']),
    dueDate: z.coerce.date().nullable().optional(),
    paymentDate: z.coerce.date().nullable().optional(),
    creditCardId: z.uuid().nullable().optional(),
    splits: z.array(SplitSchema).min(1).optional(),
  })
  .refine(
    (data) => {
      if (!data.splits || data.splits.length === 0) return true;
      const total = data.splits.reduce((sum, s) => sum + s.amount, 0);
      return Math.abs(total - data.amount) < 0.01;
    },
    { message: 'A soma dos splits deve ser igual ao valor total da transação', path: ['splits'] },
  );

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
  creditCardId: z.uuid().nullable().optional(),
});

export const UpdateTransactionSchema = z
  .object({
    amount: z.number().positive().optional(),
    description: z.string().min(1).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    type: z.enum(['expense', 'income']).optional(),
    status: z.enum(['paid', 'pending']).optional(),
    dueDate: z.coerce.date().nullable().optional(),
    paymentDate: z.coerce.date().nullable().optional(),
    creditCardId: z.uuid().nullable().optional(),
    splits: z.array(SplitSchema).min(1).optional(),
  })
  .refine(
    (data) => {
      if (!data.splits || data.splits.length === 0 || data.amount == null) return true;
      const total = data.splits.reduce((sum, s) => sum + s.amount, 0);
      return Math.abs(total - data.amount) < 0.01;
    },
    { message: 'A soma dos splits deve ser igual ao valor total da transação', path: ['splits'] },
  );

export type AIReceiptData = z.infer<typeof AIReceiptSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type GetTransactionsInput = z.infer<typeof GetTransactionsSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type SplitInput = z.infer<typeof SplitSchema>;