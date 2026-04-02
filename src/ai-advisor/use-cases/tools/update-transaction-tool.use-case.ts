import { Inject, Injectable, Scope } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ToolUpdateTransactionArgsSchema } from 'src/schemas/ai-advisor.schema';
import { TransactionsRepositoryInterface } from 'src/transactions/transactions.interface';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class UpdateTransactionToolUseCase extends BaseAiTool<
  typeof ToolUpdateTransactionArgsSchema
> {
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  readonly name = 'update_transaction';
  readonly description =
    'Altera uma transação existente. Primeiro, chama com confirm=false para gerar um card de revisão. Após aprovação do usuário, chama novamente com confirm=true para finalizar.';
  readonly schema = ToolUpdateTransactionArgsSchema;

  getJsonSchema() {
    return {
      type: 'OBJECT',
      properties: {
        transactionId: {
          type: 'STRING',
          description: 'ID da transação que será alterada.',
        },
        confirm: {
          type: 'BOOLEAN',
          description:
            'false para gerar proposta de alteração; true para confirmar e salvar.',
        },
        amount: {
          type: 'NUMBER',
          description: 'Novo valor total da transação.',
        },
        description: {
          type: 'STRING',
          description: 'Nova descrição.',
        },
        categoryId: {
          type: 'STRING',
          description: 'ID da categoria.',
        },
        paymentDate: {
          type: 'STRING',
          description: 'Data de pagamento no formato ISO.',
        },
        installments: {
          type: 'NUMBER',
          description: 'Quantidade de parcelas (ex.: 6 para parcelar em 6x).',
        },
        type: {
          type: 'STRING',
          enum: ['expense', 'income'],
          description: 'Tipo da transação.',
        },
        status: {
          type: 'STRING',
          enum: ['paid', 'pending', 'overdue', 'cancelled'],
          description: 'Status da transação.',
        },
        creditCardId: {
          type: 'STRING',
          description: 'ID do cartão de crédito.',
        },
        debitCardId: {
          type: 'STRING',
          description: 'ID do cartão de débito.',
        },
        splits: {
          type: 'ARRAY',
          description:
            'Divisão do pagamento por métodos. Obrigatório quando usuário informar valores quebrados (ex.: 120 no débito e 5 no dinheiro).',
          items: {
            type: 'OBJECT',
            properties: {
              amount: {
                type: 'NUMBER',
                description: 'Valor deste split.',
              },
              paymentMethod: {
                type: 'STRING',
                enum: [
                  'credit_card',
                  'debit',
                  'pix',
                  'cash',
                  'transfer',
                  'other',
                ],
                description: 'Método de pagamento deste split.',
              },
              creditCardId: {
                type: 'STRING',
                description:
                  'ID do cartão de crédito quando paymentMethod=credit_card.',
              },
              debitCardId: {
                type: 'STRING',
                description:
                  'ID do cartão de débito quando paymentMethod=debit.',
              },
            },
            required: ['amount', 'paymentMethod'],
          },
        },
      },
      required: ['transactionId'],
    };
  }

  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolUpdateTransactionArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const transactionId = args.transactionId?.trim();

    if (!transactionId) {
      return {
        responseForModel: { error: 'transactionId é obrigatório.' },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: 'Erro',
          payload: { error: 'transactionId é obrigatório.' },
        },
      };
    }

    // Busca a transação original
    const original =
      await this.transactionsRepository.getTransactionById(transactionId);

    if (!original) {
      return {
        responseForModel: { error: 'Transação não encontrada.' },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: 'Erro',
          payload: { error: 'Transação não encontrada.' },
        },
      };
    }

    const originalSplits = Array.isArray((original as any).splits)
      ? (original as any).splits
      : undefined;
    const defaultCardIds = await this.resolveDefaultCardIds(
      (original as any).userId,
    );
    const normalizedSplits = this.normalizeSplitsWithFallbacks(
      args.splits,
      args.creditCardId ?? defaultCardIds.creditCardId,
      args.debitCardId ?? defaultCardIds.debitCardId,
    );

    // Constrói o objeto com as mudanças propostas
    const proposedData: any = {
      amount: args.amount ?? original.amount,
      description: args.description ?? original.description,
      categoryId: args.categoryId ?? original.categoryId,
      paymentDate: args.paymentDate ?? original.paymentDate,
      installments: args.installments ?? (original as any).installments,
      type: args.type ?? original.type,
      status: args.status ?? original.status,
      creditCardId: args.creditCardId ?? original.creditCardId,
      debitCardId: args.debitCardId ?? original.debitCardId,
      splits: normalizedSplits ?? originalSplits,
    };

    // Enriquece os dados propostos com nomes de categorias e informações de cartões
    const proposedEnriched = await this.enrichTransactionData(proposedData);
    const originalEnriched = await this.enrichTransactionData({
      amount: original.amount,
      description: original.description,
      categoryId: original.categoryId,
      paymentDate: original.paymentDate,
      installments: (original as any).installments,
      type: original.type,
      status: original.status,
      creditCardId: original.creditCardId,
      debitCardId: original.debitCardId,
      splits: originalSplits,
    });

    originalEnriched.installmentPlan = await this.buildInstallmentPlanFromTransaction(
      original,
    );

    proposedEnriched.installmentPlan = await this.buildProposedInstallmentPlan(
      original,
      proposedData,
      originalEnriched.installmentPlan,
    );

    // Se confirm === false, retorna o card de análise
    if (!args.confirm) {
      return {
        responseForModel: {
          success: false,
          message:
            'Proposta de alteração gerada. Aguardando confirmação do usuário.',
          proposed: proposedEnriched,
          original: originalEnriched,
          requiresConfirmation: true,
        },
        visualization: {
          type: 'transaction_diff',
          toolName: this.name,
          title: `Proposta de alteração: ${original.description}`,
          payload: {
            transactionId,
            original: originalEnriched,
            proposed: proposedEnriched,
            requiresConfirmation: true,
          },
        },
      };
    }

    // Se confirm === true, executa o update
    try {
      // Remove campos null/undefined
      const updatePayload: any = {};

      if (args.amount !== undefined && args.amount !== null) {
        updatePayload.amount = args.amount;
      }
      if (args.description !== undefined && args.description !== null) {
        updatePayload.description = args.description;
      }
      if (args.categoryId !== undefined && args.categoryId !== null) {
        updatePayload.categoryId = args.categoryId;
      }
      if (args.paymentDate !== undefined && args.paymentDate !== null) {
        updatePayload.paymentDate = args.paymentDate;
      }
      if (args.installments !== undefined && args.installments !== null) {
        updatePayload.installments = args.installments;
      }
      if (args.type !== undefined && args.type !== null) {
        updatePayload.type = args.type;
      }
      if (args.status !== undefined && args.status !== null) {
        updatePayload.status = args.status;
      }
      if (args.creditCardId !== undefined && args.creditCardId !== null) {
        updatePayload.creditCardId = args.creditCardId;
      }
      if (args.debitCardId !== undefined && args.debitCardId !== null) {
        updatePayload.debitCardId = args.debitCardId;
      }
      if (normalizedSplits !== undefined && normalizedSplits !== null) {
        updatePayload.splits = normalizedSplits;
      }

      const updatedTransaction =
        await this.transactionsRepository.updateTransaction(
          transactionId,
          updatePayload,
        );

      return {
        responseForModel: {
          success: true,
          message: 'Transação atualizada com sucesso!',
          transaction: updatedTransaction,
        },
        visualization: {
          type: 'transaction',
          toolName: this.name,
          title: 'Transação atualizada',
          payload: {
            ...updatedTransaction,
            success: true,
          },
        },
      };
    } catch (error) {
      return {
        responseForModel: {
          success: false,
          error: `Erro ao atualizar a transação: ${
            error instanceof Error ? error.message : 'Desconhecido'
          }`,
        },
        visualization: {
          type: 'table_summary',
          toolName: this.name,
          title: 'Erro na atualização',
          payload: {
            error: 'Não foi possível atualizar a transação. Tente novamente.',
          },
        },
      };
    }
  }

  private async enrichTransactionData(data: any): Promise<any> {
    const enriched = { ...data };

    // Busca informações da categoria
    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (category) {
        enriched.categoryName = category.name;
        enriched.categoryIcon = category.icon;
      }
    }

    // Busca informações do cartão de crédito
    if (data.creditCardId) {
      const creditCard = await this.prisma.creditCard.findUnique({
        where: { id: data.creditCardId },
      });
      if (creditCard) {
        enriched.creditCardName = creditCard.name;
        enriched.creditCardFlag = creditCard.flag;
        enriched.creditCardLastFourDigits = creditCard.lastFourDigits;
      }
    }

    // Busca informações do cartão de débito
    if (data.debitCardId) {
      const debitCard = await this.prisma.debitCard.findUnique({
        where: { id: data.debitCardId },
      });
      if (debitCard) {
        enriched.debitCardName = debitCard.name;
        enriched.debitCardFlag = debitCard.flag;
        enriched.debitCardLastFourDigits = debitCard.lastFourDigits;
      }
    }

    const normalizedSplits = this.normalizeSplitsWithFallbacks(
      data.splits,
      data.creditCardId,
      data.debitCardId,
    );

    if (Array.isArray(normalizedSplits) && normalizedSplits.length > 0) {
      enriched.splits = await Promise.all(
        normalizedSplits.map(async (split: any) => {
          const normalizedSplit = {
            amount: Number(split.amount || 0),
            paymentMethod: split.paymentMethod,
            creditCardId: split.creditCardId ?? null,
            debitCardId: split.debitCardId ?? null,
          };

          if (normalizedSplit.creditCardId) {
            const splitCreditCard = await this.prisma.creditCard.findUnique({
              where: { id: normalizedSplit.creditCardId },
            });

            if (splitCreditCard) {
              return {
                ...normalizedSplit,
                creditCardName: splitCreditCard.name,
                creditCardFlag: splitCreditCard.flag,
                creditCardLastFourDigits: splitCreditCard.lastFourDigits,
                creditCard: {
                  id: splitCreditCard.id,
                  name: splitCreditCard.name,
                  flag: splitCreditCard.flag,
                  lastFourDigits: splitCreditCard.lastFourDigits,
                },
              };
            }
          }

          if (normalizedSplit.debitCardId) {
            const splitDebitCard = await this.prisma.debitCard.findUnique({
              where: { id: normalizedSplit.debitCardId },
            });

            if (splitDebitCard) {
              return {
                ...normalizedSplit,
                debitCardName: splitDebitCard.name,
                debitCardFlag: splitDebitCard.flag,
                debitCardLastFourDigits: splitDebitCard.lastFourDigits,
                debitCard: {
                  id: splitDebitCard.id,
                  name: splitDebitCard.name,
                  flag: splitDebitCard.flag,
                  lastFourDigits: splitDebitCard.lastFourDigits,
                },
              };
            }
          }

          return normalizedSplit;
        }),
      );
    }

    return enriched;
  }

  private normalizeSplitsWithFallbacks(
    splits: any,
    fallbackCreditCardId?: string | null,
    fallbackDebitCardId?: string | null,
  ) {
    if (!Array.isArray(splits)) {
      return undefined;
    }

    return splits
      .map((split: any) => {
        if (!split || typeof split !== 'object') {
          return null;
        }

        const paymentMethod = String(split.paymentMethod || '').toLowerCase();
        const parsedCreditCardId = this.parseUuidOrNull(split.creditCardId);
        const parsedDebitCardId = this.parseUuidOrNull(split.debitCardId);
        const normalizedSplit: any = {
          ...split,
          paymentMethod,
          creditCardId: parsedCreditCardId,
          debitCardId: parsedDebitCardId,
        };

        if (
          paymentMethod === 'debit' &&
          !normalizedSplit.debitCardId &&
          fallbackDebitCardId
        ) {
          normalizedSplit.debitCardId = fallbackDebitCardId;
        }

        if (
          paymentMethod === 'credit_card' &&
          !normalizedSplit.creditCardId &&
          fallbackCreditCardId
        ) {
          normalizedSplit.creditCardId = fallbackCreditCardId;
        }

        return normalizedSplit;
      })
      .filter(Boolean);
  }

  private parseUuidOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return UpdateTransactionToolUseCase.UUID_REGEX.test(trimmed)
      ? trimmed
      : null;
  }

  private async resolveDefaultCardIds(userId?: string | null) {
    if (!userId) {
      return {
        creditCardId: null as string | null,
        debitCardId: null as string | null,
      };
    }

    const [creditCards, debitCards] = await Promise.all([
      this.prisma.creditCard.findMany({
        where: { userId },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      this.prisma.debitCard.findMany({
        where: { userId },
        select: { id: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
    ]);

    return {
      creditCardId: creditCards.length === 1 ? creditCards[0].id : null,
      debitCardId: debitCards.length === 1 ? debitCards[0].id : null,
    };
  }

  private async buildInstallmentPlanFromTransaction(transaction: any) {
    const groupId = transaction?.installmentGroupId;

    if (groupId) {
      const groupedTransactions =
        await this.transactionsRepository.getInstallmentTransactions(groupId);

      if (Array.isArray(groupedTransactions) && groupedTransactions.length > 0) {
        const totalInstallments = groupedTransactions.length;

        return groupedTransactions
          .slice()
          .sort((a: any, b: any) => {
            const currentA = Number(a?.installmentCurrent ?? 0);
            const currentB = Number(b?.installmentCurrent ?? 0);
            return currentA - currentB;
          })
          .map((item: any, index: number) => ({
            installment: Number(item?.installmentCurrent ?? index + 1),
            totalInstallments,
            amount: Number(item?.amount ?? 0),
            dueDate: item?.dueDate ?? item?.paymentDate ?? null,
            status: item?.status ?? 'pending',
          }));
      }
    }

    return this.simulateInstallmentPlan({
      totalAmount: Number(transaction?.amount ?? 0),
      installments: Number(transaction?.installments ?? 1),
      baseDate:
        transaction?.purchaseDate ??
        transaction?.paymentDate ??
        transaction?.dueDate ??
        null,
      firstStatus: transaction?.status ?? 'pending',
    });
  }

  private async buildProposedInstallmentPlan(
    originalTransaction: any,
    proposedData: any,
    originalPlan: Array<Record<string, any>>,
  ) {
    const requestedInstallments = Number(
      proposedData?.installments ?? originalTransaction?.installments ?? 1,
    );

    const safeInstallments =
      Number.isFinite(requestedInstallments) && requestedInstallments > 0
        ? Math.trunc(requestedInstallments)
        : 1;

    const amount = Number(proposedData?.amount ?? originalTransaction?.amount ?? 0);

    if (
      originalPlan.length > 0 &&
      safeInstallments === originalPlan.length &&
      Math.abs(Number(originalTransaction?.amount ?? 0) - amount) < 0.01
    ) {
      return originalPlan;
    }

    return this.simulateInstallmentPlan({
      totalAmount: amount,
      installments: safeInstallments,
      baseDate:
        proposedData?.paymentDate ??
        proposedData?.dueDate ??
        originalTransaction?.purchaseDate ??
        originalTransaction?.paymentDate ??
        originalTransaction?.dueDate ??
        null,
      firstStatus: proposedData?.status ?? originalTransaction?.status ?? 'pending',
    });
  }

  private simulateInstallmentPlan(params: {
    totalAmount: number;
    installments: number;
    baseDate: string | Date | null;
    firstStatus: string;
  }) {
    const totalAmount = Number(params.totalAmount ?? 0);
    const installments = Math.max(1, Math.trunc(Number(params.installments ?? 1)));

    if (!Number.isFinite(totalAmount) || totalAmount <= 0 || installments <= 1) {
      return [];
    }

    const baseDate = this.parseDate(params.baseDate) ?? new Date();
    const perInstallment = Math.floor((totalAmount / installments) * 100) / 100;
    const remainder = Number((totalAmount - perInstallment * installments).toFixed(2));

    return Array.from({ length: installments }).map((_, index) => {
      const isLast = index === installments - 1;
      const amount = isLast
        ? Number((perInstallment + remainder).toFixed(2))
        : perInstallment;
      const dueDate = this.addMonths(baseDate, index);

      return {
        installment: index + 1,
        totalInstallments: installments,
        amount,
        dueDate: dueDate.toISOString(),
        status: index === 0 && params.firstStatus === 'paid' ? 'paid' : 'pending',
      };
    });
  }

  private parseDate(value: unknown) {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private addMonths(date: Date, months: number) {
    const baseDate = new Date(date);
    const day = baseDate.getDate();

    const result = new Date(baseDate);
    result.setDate(1);
    result.setMonth(result.getMonth() + months);

    const lastDayOfMonth = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0,
    ).getDate();

    result.setDate(Math.min(day, lastDayOfMonth));
    return result;
  }
}
