import { z } from 'zod';

export const getDashboardMetricsResponseSchema = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  netBalance: z.number(),
  availableBalance: z.number(),
  savedAmount: z.number(),
  categoryBreakdown: z.array(
    z.object({
      category: z.string(),
      categoryId: z.string().uuid().nullable().optional(),
      income: z.number(),
      expenses: z.number(),
      net: z.number(),
    }),
  ),
  pendingBills: z.object({
    count: z.number(),
    totalAmount: z.number(),
    overdue: z.number(),
  }),
});

export type GetDashboardMetricsResponse = z.infer<
  typeof getDashboardMetricsResponseSchema
>;

export const getDashboardMetricsSchema = z
  .object({
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2000).max(2100).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(
    (data) =>
      (Boolean(data.startDate) && Boolean(data.endDate)) ||
      (!data.startDate && !data.endDate),
    {
      message: 'startDate e endDate devem ser enviados juntos',
      path: ['endDate'],
    },
  )
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: 'startDate deve ser menor ou igual a endDate',
      path: ['endDate'],
    },
  );

export type GetDashboardMetricsDto = z.infer<typeof getDashboardMetricsSchema>;

export const getDashboardSnapshotSchema = z
  .object({
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(2000).max(2100).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    status: z.enum(['paid', 'pending']).optional(),
    type: z.enum(['expense', 'income']).optional(),
    categoryId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      (Boolean(data.startDate) && Boolean(data.endDate)) ||
      (!data.startDate && !data.endDate),
    {
      message: 'startDate e endDate devem ser enviados juntos',
      path: ['endDate'],
    },
  )
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate <= data.endDate,
    {
      message: 'startDate deve ser menor ou igual a endDate',
      path: ['endDate'],
    },
  );

export type GetDashboardSnapshotDto = z.infer<
  typeof getDashboardSnapshotSchema
>;

export const getDashboardSnapshotResponseSchema = z.object({
  metrics: z.object({
    totalIncome: z.number().min(0),
    totalExpenses: z.number().min(0),
    netBalance: z.number(),
    availableBalance: z.number(),
    savedAmount: z.number().min(0),
    incomeChangePercent: z.number().min(-1000).max(1000), // Allow large negative/positive changes
    expensesChangePercent: z.number().min(-1000).max(1000),
    balanceChangePercent: z.number().min(-1000).max(1000),
    previousMonth: z.object({
      income: z.number().min(0),
      expenses: z.number().min(0),
      balance: z.number(),
    }),
    categoryBreakdown: z.array(
      z.object({
        category: z.string().min(1),
        categoryId: z.string().uuid().nullable().optional(),
        income: z.number().min(0),
        expenses: z.number().min(0),
        net: z.number(),
      }),
    ),
    pendingBills: z.object({
      count: z.number().min(0),
      totalAmount: z.number().min(0),
      overdue: z.number().min(0),
    }),
  }),
  transactions: z.array(z.any()), // Keep flexible for now
  subscriptions: z.array(z.any()),
  budgets: z.array(z.any()),
  budgetProgress: z.array(
    z.object({
      budget: z.any(),
      spent: z.number().min(0),
      remaining: z.number(),
      percentage: z.number().min(0).max(100),
    }),
  ),
  categories: z.array(z.any()),
  creditCards: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      limit: z.number().min(0),
      availableLimit: z.number(), // Can be negative if over limit
    }),
  ),
  debitCards: z.array(z.any()),
  vaults: z.array(z.any()),
});

export type GetDashboardSnapshotResponse = z.infer<
  typeof getDashboardSnapshotResponseSchema
>;
