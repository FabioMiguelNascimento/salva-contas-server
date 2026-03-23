import { z } from 'zod';

export const CreateVaultSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(80),
  targetAmount: z.number().positive().optional(),
  color: z.string().trim().max(32).optional(),
  icon: z.string().trim().max(64).optional(),
});

export const UpdateVaultSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    targetAmount: z.number().positive().nullable().optional(),
    color: z.string().trim().max(32).nullable().optional(),
    icon: z.string().trim().max(64).nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.targetAmount !== undefined ||
      data.color !== undefined ||
      data.icon !== undefined,
    {
      message: 'Informe ao menos um campo para atualização',
    },
  );

export const VaultAmountSchema = z.object({
  amount: z.number().positive('O valor deve ser maior que zero'),
});

export const GetVaultHistorySchema = z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  cursor: z.string().trim().min(1).optional(),
});

export type CreateVaultInput = z.infer<typeof CreateVaultSchema>;
export type UpdateVaultInput = z.infer<typeof UpdateVaultSchema>;
export type VaultAmountInput = z.infer<typeof VaultAmountSchema>;
export type GetVaultHistoryInput = z.infer<typeof GetVaultHistorySchema>;
