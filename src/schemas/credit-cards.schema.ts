import { z } from 'zod';

export const CreateCreditCardSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  flag: z.enum(['visa', 'mastercard', 'american_express', 'elo', 'hipercard', 'other']),
  lastFourDigits: z.string().regex(/^\d{4}$/, 'Últimos 4 dígitos devem conter exatamente 4 números'),
  limit: z.number().positive('Limite deve ser maior que zero'),
  closingDay: z.number().min(1).max(31, 'Dia de fechamento deve ser entre 1 e 31'),
  dueDay: z.number().min(1).max(31, 'Dia de vencimento deve ser entre 1 e 31'),
});

export const UpdateCreditCardSchema = z.object({
  name: z.string().min(1).optional(),
  flag: z.enum(['visa', 'mastercard', 'american_express', 'elo', 'hipercard', 'other']).optional(),
  lastFourDigits: z.string().regex(/^\d{4}$/).optional(),
  limit: z.number().positive().optional(),
  closingDay: z.number().min(1).max(31).optional(),
  dueDay: z.number().min(1).max(31).optional(),
  status: z.enum(['active', 'blocked', 'expired', 'cancelled']).optional(),
});

export const GetCreditCardsSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.enum(['active', 'blocked', 'expired', 'cancelled']).optional(),
});

export type CreateCreditCardInput = z.infer<typeof CreateCreditCardSchema>;
export type UpdateCreditCardInput = z.infer<typeof UpdateCreditCardSchema>;
export type GetCreditCardsInput = z.infer<typeof GetCreditCardsSchema>;