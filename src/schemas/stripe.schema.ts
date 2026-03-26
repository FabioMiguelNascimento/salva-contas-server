import { z } from 'zod';

export const StripeCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID é obrigatório'),
});

export type StripeCheckoutInput = z.infer<typeof StripeCheckoutSchema>;
