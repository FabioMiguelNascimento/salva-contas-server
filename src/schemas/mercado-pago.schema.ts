import { z } from 'zod';

export const MercadoPagoCheckoutSchema = z.object({
  planTier: z.enum(['PRO', 'FAMILY']),
  cycle: z.enum(['monthly', 'yearly']),
});

export type MercadoPagoCheckoutInput = z.infer<typeof MercadoPagoCheckoutSchema>;
