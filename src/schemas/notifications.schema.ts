import { z } from 'zod';

export const CreateNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['due_date', 'budget_limit', 'payment_reminder', 'subscription_renewal', 'general']),
  relatedId: z.string().uuid().optional(),
});

export const GetNotificationsSchema = z.object({
  status: z.enum(['read', 'unread']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

export const MarkAsReadSchema = z.object({
  id: z.string().uuid(),
});

export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type GetNotificationsInput = z.infer<typeof GetNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;