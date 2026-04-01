import { z } from 'zod';

export const ReportFeatureSchema = z.enum([
  'contas',
  'cartoes',
  'transacoes',
  'assinaturas',
  'orcamentos',
  'cofrinhos',
]);

export const ReportFormatSchema = z.enum(['csv', 'pdf']);

export const ExportReportQuerySchema = z.object({
  format: ReportFormatSchema.default('csv'),
  query: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['expense', 'income']).optional(),
  status: z.enum(['paid', 'pending']).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const PreviewReportQuerySchema = z.object({
  query: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['expense', 'income']).optional(),
  status: z.enum(['paid', 'pending']).optional(),
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(1900).max(2100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export const ExportReportParamsSchema = z.object({
  feature: ReportFeatureSchema,
});

export type ReportFeature = z.infer<typeof ReportFeatureSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export type ExportReportQueryInput = z.infer<typeof ExportReportQuerySchema>;
export type ExportReportParamsInput = z.infer<typeof ExportReportParamsSchema>;
export type PreviewReportQueryInput = z.infer<typeof PreviewReportQuerySchema>;
