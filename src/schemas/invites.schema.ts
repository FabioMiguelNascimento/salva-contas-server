import { z } from 'zod';

export const AcceptInviteSchema = z.object({
  token: z.string().min(10),
});

export type AcceptInviteInput = z.infer<typeof AcceptInviteSchema>;
