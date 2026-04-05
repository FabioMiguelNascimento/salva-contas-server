import { parseAmountLike } from 'src/utils/amount-parser';
import { z } from 'zod';

const parseOptionalString = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseOptionalUuidString = (value: unknown) => {
  const parsed = parseOptionalString(value);

  if (typeof parsed !== 'string') {
    return undefined;
  }

  return UUID_REGEX.test(parsed) ? parsed : undefined;
};

const parseOptionalNumber = (value: unknown) => {
  return parseAmountLike(value);
};

const parseOptionalInstallments = (value: unknown) => {
  const parsed = parseOptionalNumber(value);

  if (parsed === undefined) {
    return undefined;
  }

  const integerValue = Math.trunc(parsed);
  return integerValue >= 1 ? integerValue : undefined;
};

const parseOptionalBoolean = (value: unknown) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'sim'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'nao', 'não'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
};

const normalizeTransactionType = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'expense' || normalized === 'income'
    ? normalized
    : undefined;
};

const normalizeTransactionStatus = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  return ['paid', 'pending', 'overdue', 'cancelled'].includes(normalized)
    ? normalized
    : undefined;
};

const normalizeSplitPaymentMethod = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'debit_card') {
    return 'debit';
  }

  if (normalized === 'credit' || normalized === 'creditcard') {
    return 'credit_card';
  }

  if (normalized === 'dinheiro') {
    return 'cash';
  }

  if (normalized === 'transferencia' || normalized === 'transferência') {
    return 'transfer';
  }

  return normalized;
};

const parseOptionalSplits = (value: unknown) => {
  let rawSplits = value;

  if (typeof rawSplits === 'string') {
    const trimmed = rawSplits.trim();
    if (!trimmed) {
      return undefined;
    }

    try {
      rawSplits = JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }

  if (
    rawSplits &&
    typeof rawSplits === 'object' &&
    !Array.isArray(rawSplits) &&
    Array.isArray((rawSplits as any).items)
  ) {
    rawSplits = (rawSplits as any).items;
  }

  if (!Array.isArray(rawSplits)) {
    return undefined;
  }

  const normalizedSplits = rawSplits
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const rawItem = item as Record<string, unknown>;
      const amount = parseOptionalNumber(rawItem.amount);
      const paymentMethod = normalizeSplitPaymentMethod(rawItem.paymentMethod);

      if (amount === undefined || !paymentMethod) {
        return null;
      }

      return {
        amount,
        paymentMethod,
        creditCardId: parseOptionalUuidString(rawItem.creditCardId) ?? null,
        debitCardId: parseOptionalUuidString(rawItem.debitCardId) ?? null,
      };
    })
    .filter(Boolean);

  return normalizedSplits.length > 0 ? normalizedSplits : undefined;
};

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

export const ToolTransactionDetailsArgsSchema = z
  .object({
    transactionId: z.string().trim().optional(),
    query: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const hasTransactionId = !!data.transactionId?.trim();
      const hasQuery = !!data.query?.trim();
      return hasTransactionId || hasQuery;
    },
    {
      message: 'transactionId or query is required',
      path: ['transactionId'],
    },
  );

export const ToolProcessReceiptArgsSchema = z.object({
  fileIndex: z.coerce.number().int().min(0),
  paymentDate: z.string().optional(),
  dueDate: z.string().optional(),
  creditCardId: z.string().optional().nullable(),
});

export const ToolCreateTransactionArgsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1)
    .describe('Descrição da transação (ex: 200 reais de mercado)'),
  paymentDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  creditCardId: z.string().optional().nullable(),
});

export const ToolUpdateTransactionArgsSchema = z.object({
  transactionId: z
    .preprocess(parseOptionalString, z.string().min(1).optional())
    .describe('ID único da transação a ser alterada'),
  confirm: z
    .preprocess(parseOptionalBoolean, z.boolean().default(false))
    .describe('Se true, confirma a alteração. Se false, gera card de análise'),
  amount: z.preprocess(parseOptionalNumber, z.number().optional().nullable()),
  description: z.preprocess(
    parseOptionalString,
    z.string().optional().nullable(),
  ),
  categoryId: z.preprocess(
    parseOptionalString,
    z.string().optional().nullable(),
  ),
  paymentDate: z.preprocess(
    parseOptionalString,
    z.string().optional().nullable(),
  ),
  installments: z.preprocess(
    parseOptionalInstallments,
    z.number().int().min(1).optional().nullable(),
  ),
  type: z.preprocess(
    normalizeTransactionType,
    z.enum(['expense', 'income']).optional().nullable(),
  ),
  status: z.preprocess(
    normalizeTransactionStatus,
    z.enum(['paid', 'pending', 'overdue', 'cancelled']).optional().nullable(),
  ),
  creditCardId: z.preprocess(
    parseOptionalUuidString,
    z.string().optional().nullable(),
  ),
  debitCardId: z.preprocess(
    parseOptionalUuidString,
    z.string().optional().nullable(),
  ),
  splits: z.preprocess(
    parseOptionalSplits,
    z
      .array(
        z.object({
          amount: z.number().positive(),
          paymentMethod: z.enum([
            'credit_card',
            'debit',
            'pix',
            'cash',
            'transfer',
            'other',
          ]),
          creditCardId: z.string().optional().nullable(),
          debitCardId: z.string().optional().nullable(),
        }),
      )
      .min(1)
      .optional()
      .nullable(),
  ),
});

export const ToolVaultAiActionArgsSchema = z.object({
  description: z
    .preprocess(parseOptionalString, z.string().min(1).optional())
    .describe('Comando em linguagem natural (fallback). Ex.: Adicione 500 no cofrinho viagem.'),
  action: z
    .preprocess(parseOptionalString, z.enum(['deposit', 'withdraw', 'yield']).optional())
    .describe('Acao estruturada principal da tool.'),
  amount: z
    .preprocess(parseOptionalNumber, z.number().positive().optional())
    .describe('Valor da acao. Aceita 2000, 2k, 2 mil, etc.'),
  vaultName: z
    .preprocess(parseOptionalString, z.string().min(1).optional())
    .describe('Nome do cofrinho alvo (opcional quando houver apenas um cofrinho).'),
}).refine(
  (data) => Boolean(data.description) || (Boolean(data.action) && Boolean(data.amount)),
  {
    message:
      'Informe description ou os campos estruturados action e amount.',
    path: ['description'],
  },
);

export type AiAdvisorChatRequestInput = z.infer<
  typeof AiAdvisorChatRequestSchema
>;
export type AiAdvisorHistoryMessageInput = z.infer<
  typeof AiAdvisorHistoryMessageSchema
>;
