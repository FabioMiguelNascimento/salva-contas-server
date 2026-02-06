import { z } from 'zod';

export const UploadAttachmentSchema = z.object({
  transactionId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export const GetAttachmentsSchema = z.object({
  transactionId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  type: z.enum(['pdf', 'image', 'document']).optional(),
});

export const UpdateAttachmentSchema = z.object({
  description: z.string().max(500).optional(),
});

export type UploadAttachmentInput = z.infer<typeof UploadAttachmentSchema>;
export type GetAttachmentsInput = z.infer<typeof GetAttachmentsSchema>;
export type UpdateAttachmentInput = z.infer<typeof UpdateAttachmentSchema>;
