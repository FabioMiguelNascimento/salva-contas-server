import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    AiAdvisorChatRequestInput,
    ToolCreateTransactionArgsSchema,
    ToolExpensesByCategoryArgsSchema,
    ToolMonthlySummaryArgsSchema,
    ToolProcessReceiptArgsSchema,
    ToolSpendingTrendArgsSchema,
    ToolTransactionDetailsArgsSchema,
} from 'src/schemas/ai-advisor.schema';
import { StorageService } from 'src/storage/storage.service';
import ProcessTransactionUseCase from 'src/transactions/use-cases/process-transaction.use-case';

type AiVisualizationType = 'chart_donut' | 'chart_line' | 'table_summary' | 'transaction';

type AiVisualization = {
  type: AiVisualizationType;
  toolName: string;
  title: string;
  payload: Record<string, any>;
};

@Injectable({ scope: Scope.REQUEST })
export class AiAdvisorService {
  private readonly genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  private readonly modelName = process.env.AI_ADVISOR_MODEL || 'gemini-2.5-flash';

  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
    private readonly storageService: StorageService,
    private readonly processTransactionUseCase: ProcessTransactionUseCase,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async chat(input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] }) {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });
    const visualizations: AiVisualization[] = [];
    const calledTools: string[] = [];

    const now = new Date();
    const today = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const contents: any[] = [
      {
        role: 'user',
        parts: [
          {
            text: 'Voce e o Boletinho, um assistente financeiro. Seja objetivo, amigavel e em portugues do Brasil. Quando receber dados de ferramentas, resuma em linguagem simples e acione insights acionaveis. Se o usuario enviar um comprovante (imagem), processe automaticamente e nao peça mais descricao.',
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            text: `Data atual: ${today}. Mes atual: ${currentMonth}. Ano atual: ${currentYear}. Use esses valores quando o usuario disser "este mes" ou "este ano".`,
          },
        ],
      },
      ...input.history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    ];

    if (input.files?.length) {
      const fileList = input.files
        .map((file, index) => `${index}: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`)
        .join('\n');

      contents.push({
        role: 'user',
        parts: [
          {
            text: `Arquivos anexados:\n${fileList}\n\nVou processar os comprovantes e registrar as transações automaticamente.`,
          },
        ],
      });

      const visualizationsFromFiles: AiVisualization[] = [];
      const errors: string[] = [];

      for (const [index, file] of input.files.entries()) {
        try {
          const transaction = await this.processTransactionUseCase.execute(file, null, {});

          visualizationsFromFiles.push({
            type: 'transaction',
            toolName: 'process_transaction_receipt',
            title: `Transação registrada de ${file.originalname}`,
            payload: transaction,
          });
        } catch (error: any) {
          errors.push(`${file.originalname}: ${error?.message ?? 'erro desconhecido'}`);
        }
      }

      const successful = visualizationsFromFiles.length;
      const failed = errors.length;
      const pieces: string[] = [];

      if (successful) pieces.push(`${successful} registrad${successful === 1 ? 'a' : 'as'}`);
      if (failed) pieces.push(`${failed} falhou${failed === 1 ? '' : 'am'}`);

      let message = `Processado${pieces.length ? `: ${pieces.join(', ')}` : ''}.`;

      if (errors.length) {
        message += ` Erros: ${errors.join('; ')}`;
      }

      return {
        message,
        toolCalls: ['process_transaction_receipt'],
        visualization: visualizationsFromFiles[0] ?? null,
        visualizations: visualizationsFromFiles,
      };
    }

    contents.push({
      role: 'user',
      parts: [{ text: input.message }],
    });

    const tools: any[] = [
      {
        functionDeclarations: [
          {
            name: 'get_monthly_summary',
            description:
              'Retorna totais de receita, despesa e saldo para um mes/ano.',
            parameters: {
              type: 'OBJECT',
              properties: {
                month: { type: 'NUMBER', description: 'Mes numerico de 1 a 12' },
                year: { type: 'NUMBER', description: 'Ano com 4 digitos' },
              },
              required: ['month', 'year'],
            },
          },
          {
            name: 'get_expenses_by_category',
            description:
              'Retorna gastos agregados por categoria para um mes/ano para grafico de donut.',
            parameters: {
              type: 'OBJECT',
              properties: {
                month: { type: 'NUMBER', description: 'Mes numerico de 1 a 12' },
                year: { type: 'NUMBER', description: 'Ano com 4 digitos' },
              },
              required: ['month', 'year'],
            },
          },
          {
            name: 'get_spending_trend',
            description:
              'Retorna serie temporal de gastos dos ultimos X dias para grafico de linha.',
            parameters: {
              type: 'OBJECT',
              properties: {
                days_back: { type: 'NUMBER', description: 'Quantidade de dias para tras' },
              },
              required: ['days_back'],
            },
          },
          {
            name: 'get_transaction_details',
            description:
              'Retorna detalhes de uma transacao, incluindo o anexo se existir.',
            parameters: {
              type: 'OBJECT',
              properties: {
                transactionId: { type: 'STRING', description: 'ID da transacao' },
              },
              required: ['transactionId'],
            },
          },
          {
            name: 'process_transaction_receipt',
            description:
              'Processa um comprovante (imagem) e retorna os dados de transação extraídos.',
            parameters: {
              type: 'OBJECT',
              properties: {
                fileIndex: { type: 'NUMBER', description: 'Índice do arquivo na lista de anexos' },
                paymentDate: { type: 'STRING', description: 'Data de pagamento (DD/MM/YYYY)', nullable: true },
                dueDate: { type: 'STRING', description: 'Data de vencimento (DD/MM/YYYY)', nullable: true },
                creditCardId: { type: 'STRING', description: 'ID do cartão de crédito', nullable: true },
              },
              required: ['fileIndex'],
            },
          },
          {
            name: 'create_transaction',
            description:
              'Registra uma transação a partir de uma descrição em texto (sem anexo).',
            parameters: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING', description: 'Texto descrevendo a transação' },
                paymentDate: { type: 'STRING', description: 'Data de pagamento (DD/MM/YYYY)', nullable: true },
                dueDate: { type: 'STRING', description: 'Data de vencimento (DD/MM/YYYY)', nullable: true },
                creditCardId: { type: 'STRING', description: 'ID do cartão de crédito', nullable: true },
              },
              required: ['text'],
            },
          },
        ],
      },
    ];

    let finalText = '';

    for (let i = 0; i < 4; i++) {
      const result = await model.generateContent({ contents, tools } as any);
      const candidate = result.response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      const text = parts
        .map((part: any) => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();

      const functionCalls = parts
        .map((part: any) => part.functionCall)
        .filter(Boolean);

      if (!functionCalls.length) {
        finalText = text || 'Pronto. Aqui esta sua analise.';
        break;
      }

      contents.push({
        role: 'model',
        parts: functionCalls.map((call: any) => ({ functionCall: call })),
      });

      for (const functionCall of functionCalls) {
        const toolResult = await this.executeTool(functionCall.name, functionCall.args || {}, input.files);
        calledTools.push(functionCall.name);
        visualizations.push(toolResult.visualization);

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: toolResult.responseForModel,
              },
            },
          ],
        });
      }
    }

    return {
      message: finalText || 'Nao consegui concluir a analise agora. Tente novamente.',
      toolCalls: calledTools,
      visualization: visualizations.length > 0 ? visualizations[visualizations.length - 1] : null,
      visualizations,
    };
  }

  private async executeTool(name: string, rawArgs: Record<string, any>, files?: Express.Multer.File[]) {
    if (name === 'get_monthly_summary') {
      const args = ToolMonthlySummaryArgsSchema.parse(rawArgs);
      const summary = await this.getMonthlySummary(args.month, args.year);
      return {
        responseForModel: summary,
        visualization: {
          type: 'table_summary' as const,
          toolName: name,
          title: `Resumo de ${args.month}/${args.year}`,
          payload: summary,
        },
      };
    }

    if (name === 'get_expenses_by_category') {
      const args = ToolExpensesByCategoryArgsSchema.parse(rawArgs);
      const data = await this.getExpensesByCategory(args.month, args.year);
      return {
        responseForModel: data,
        visualization: {
          type: 'chart_donut' as const,
          toolName: name,
          title: `Despesas por categoria em ${args.month}/${args.year}`,
          payload: data,
        },
      };
    }

    if (name === 'get_spending_trend') {
      const args = ToolSpendingTrendArgsSchema.parse(rawArgs);
      const data = await this.getSpendingTrend(args.days_back);
      return {
        responseForModel: data,
        visualization: {
          type: 'chart_line' as const,
          toolName: name,
          title: `Tendencia de gastos (${args.days_back} dias)`,
          payload: data,
        },
      };
    }

    if (name === 'get_transaction_details') {
      const args = ToolTransactionDetailsArgsSchema.parse(rawArgs);
      const detail = await this.getTransactionDetails(args.transactionId);
      return {
        responseForModel: detail,
        visualization: {
          type: 'table_summary' as const,
          toolName: name,
          title: `Detalhes da transacao ${args.transactionId}`,
          payload: detail,
        },
      };
    }

    if (name === 'process_transaction_receipt') {
      const args = ToolProcessReceiptArgsSchema.parse(rawArgs);
      const file = files?.[args.fileIndex];

      if (!file) {
        throw new Error(`Arquivo não encontrado no índice ${args.fileIndex}.`);
      }

      const transaction = await this.processTransactionUseCase.execute(file, null, {
        creditCardId: args.creditCardId ?? undefined,
        paymentDate: args.paymentDate ?? undefined,
        dueDate: args.dueDate ?? undefined,
      });

      return {
        responseForModel: transaction,
        visualization: {
          type: 'table_summary' as const,
          toolName: name,
          title: `Transação extraída de ${file.originalname}`,
          payload: transaction,
        },
      };
    }

    if (name === 'create_transaction') {
      const args = ToolCreateTransactionArgsSchema.parse(rawArgs);

      const transaction = await this.processTransactionUseCase.execute(null, args.text, {
        creditCardId: args.creditCardId ?? undefined,
        paymentDate: args.paymentDate ?? undefined,
        dueDate: args.dueDate ?? undefined,
      });

      return {
        responseForModel: transaction,
        visualization: {
          type: 'transaction' as const,
          toolName: name,
          title: `Transação criada: ${transaction.description}`,
          payload: transaction,
        },
      };
    }

    return {
      responseForModel: { error: `Ferramenta nao suportada: ${name}` },
      visualization: {
        type: 'table_summary' as const,
        toolName: name,
        title: 'Ferramenta nao suportada',
        payload: { error: `Ferramenta nao suportada: ${name}` },
      },
    };
  }

  private async getMonthlySummary(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const [incomeAgg, expenseAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId: this.userId,
          type: 'income',
          createdAt: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId: this.userId,
          type: 'expense',
          createdAt: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount || 0);
    const totalExpenses = Number(expenseAgg._sum.amount || 0);

    return {
      month,
      year,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
    };
  }

  private async getExpensesByCategory(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryName'],
      where: {
        userId: this.userId,
        type: 'expense',
        createdAt: { gte: startDate, lt: endDate },
      },
      _sum: { amount: true },
      orderBy: {
        _sum: { amount: 'desc' },
      },
    });

    return {
      month,
      year,
      items: grouped.map((row) => ({
        category: row.categoryName || 'Sem categoria',
        total: Number(row._sum.amount || 0),
      })),
    };
  }

  private async getSpendingTrend(daysBack: number) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (daysBack - 1));
    startDate.setHours(0, 0, 0, 0);

    const expenses = await this.prisma.transaction.findMany({
      where: {
        userId: this.userId,
        type: 'expense',
        paymentDate: { gte: startDate },
      },
      select: {
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'asc' },
    });

    const grouped = new Map<string, number>();
    for (const tx of expenses) {
      const dateKey = (tx.paymentDate || today).toISOString().slice(0, 10);
      grouped.set(dateKey, (grouped.get(dateKey) || 0) + Number(tx.amount || 0));
    }

    const points: Array<{ date: string; total: number }> = [];
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      points.push({ date: key, total: Number((grouped.get(key) || 0).toFixed(2)) });
    }

    return {
      daysBack,
      points,
    };
  }

  private async getTransactionDetails(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        userId: true,
        description: true,
        amount: true,
        type: true,
        status: true,
        categoryName: true,
        dueDate: true,
        paymentDate: true,
        attachmentKey: true,
        attachmentOriginalName: true,
        attachmentMimeType: true,
      },
    });

    if (!transaction || transaction.userId !== this.userId) {
      return { error: 'Transacao nao encontrada ou acesso negado' };
    }

    let attachmentUrl: string | null = null;
    if (transaction.attachmentKey) {
      try {
        attachmentUrl = await this.storageService.getPresignedUrl(transaction.attachmentKey);
      } catch {
        attachmentUrl = null;
      }
    }

    return {
      ...transaction,
      attachmentUrl,
    };
  }
}
