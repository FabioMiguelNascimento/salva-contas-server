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

export type AIReceiptData = z.infer<typeof AIReceiptSchema>;