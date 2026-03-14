import { z } from 'zod';

export const AiAdvisorHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1),
});

export const AiAdvisorChatRequestSchema = z.object({
  history: z.array(AiAdvisorHistoryMessageSchema).default([]),
  message: z.string().trim().min(1),
});

export const ToolMonthlySummaryArgsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const ToolExpensesByCategoryArgsSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export const ToolSpendingTrendArgsSchema = z.object({
  days_back: z.coerce.number().int().min(3).max(180),
});

export const ToolTransactionDetailsArgsSchema = z.object({
  transactionId: z.string().min(1),
});

export const ToolProcessReceiptArgsSchema = z.object({
  fileIndex: z.coerce.number().int().min(0),
  paymentDate: z.string().optional(),
  dueDate: z.string().optional(),
  creditCardId: z.string().optional().nullable(),
});

export const ToolCreateTransactionArgsSchema = z.object({
  text: z.string().trim().min(1),
  paymentDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  creditCardId: z.string().optional().nullable(),
});

export type AiAdvisorChatRequestInput = z.infer<typeof AiAdvisorChatRequestSchema>;
export type AiAdvisorHistoryMessageInput = z.infer<typeof AiAdvisorHistoryMessageSchema>;
