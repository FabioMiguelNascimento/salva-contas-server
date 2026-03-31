export type AiVisualizationType =
  | 'chart_donut'
  | 'chart_line'
  | 'table_summary'
  | 'transaction';

export type CategoryRel = {
  id: string;
  userId: string | null;
  name: string;
  icon: string | null;
  isGlobal: boolean;
};

export type CardInfo = {
  id: string;
  userId: string;
  createdById: string;
  name: string;
  flag: string;
  lastFourDigits: string;
  limit: string;
  availableLimit: string;
  closingDay: number;
  dueDay: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionSplit = {
  id: string;
  transactionId: string;
  amount: string | number;
  paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'transfer' | 'other';
  creditCardId: string | null;
  debitCardId: string | null;
  createdAt: string;
  creditCard: CardInfo | null;
  debitCard: CardInfo | null;
};

export type TransactionPaymentMethod = {
  id: string;
  amount: number;
  paymentMethod: 'credit_card' | 'debit_card' | 'pix' | 'cash' | 'transfer' | 'other';
  creditCard?: {
    id: string;
    name: string;
    lastFourDigits: string;
  };
  debitCard?: {
    id: string;
    name: string;
    lastFourDigits: string;
  };
};

export type TransactionDetailsPayload = {
  id: string;
  userId: string;
  createdById: string;
  amount: string | number;
  description: string;
  category: string;
  type: 'expense' | 'income';
  status: 'paid' | 'pending' | 'overdue' | 'cancelled' | string;
  dueDate: string | null;
  paymentDate: string | null;
  rawText?: string;
  attachmentKey?: string | null;
  attachmentOriginalName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSize?: number | null;
  createdAt: string;
  categoryName: string;
  categoryId: string;
  creditCardId: string | null;
  debitCardId: string | null;
  vaultId: string | null;
  installmentGroupId: string | null;
  installmentCurrent: number | null;
  categoryRel: CategoryRel;
  creditCard: CardInfo | null;
  debitCard: CardInfo | null;
  splits: TransactionSplit[];
  createdByName: string | null;
  paymentMethods: TransactionPaymentMethod[];
};

export type TableSummaryPayload = {
  items?: Array<Record<string, unknown>>;
  message?: string;
  error?: string;
};

export type AiVisualization = {
  type: AiVisualizationType;
  toolName: string;
  title: string;
  payload: TransactionDetailsPayload | TableSummaryPayload | Record<string, any>;
};

export type ToolExecutionResult = {
  responseForModel: Record<string, any>;
  visualization: AiVisualization;
};

export type ToolEntry = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};
