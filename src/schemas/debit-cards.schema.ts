import { z } from 'zod';

export const CreateDebitCardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  flag: z.enum([
    'visa',
    'mastercard',
    'american_express',
    'elo',
    'hipercard',
    'other',
  ]),
  lastFourDigits: z
    .string()
    .regex(/^\d{4}$/, 'Últimos 4 dígitos devem conter exatamente 4 números'),
});

export const UpdateDebitCardSchema = z.object({
  name: z.string().min(1).optional(),
  flag: z
    .enum([
      'visa',
      'mastercard',
      'american_express',
      'elo',
      'hipercard',
      'other',
    ])
    .optional(),
  lastFourDigits: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  status: z.enum(['active', 'blocked', 'expired', 'cancelled']).optional(),
});

export const GetDebitCardsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.enum(['active', 'blocked', 'expired', 'cancelled']).optional(),
});

export type CreateDebitCardInput = z.infer<typeof CreateDebitCardSchema>;
export type UpdateDebitCardInput = z.infer<typeof UpdateDebitCardSchema>;
export type GetDebitCardsInput = z.infer<typeof GetDebitCardsSchema>;
