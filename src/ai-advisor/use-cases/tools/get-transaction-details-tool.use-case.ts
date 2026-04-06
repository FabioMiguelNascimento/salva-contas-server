import { Injectable, Scope } from '@nestjs/common';
import { ToolTransactionDetailsArgsSchema } from 'src/schemas/ai-advisor.schema';
import { extractFirstAmountFromText } from 'src/utils/amount-parser';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';
import { TransactionSearchService } from '../../services/transaction-search.service';

@Injectable({ scope: Scope.REQUEST })
export class GetTransactionDetailsToolUseCase extends BaseAiTool<
  typeof ToolTransactionDetailsArgsSchema
> {
  readonly name = 'get_transaction_details';
  readonly description =
    'Retorna detalhes de uma transação. Se houver mais de uma correspondência, retorna uma lista. Passe transactionId exato OU query (texto ou valor como "131,11").';
  readonly schema = ToolTransactionDetailsArgsSchema;

  constructor(
    private readonly searchService: TransactionSearchService,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolTransactionDetailsArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const transactionId = args.transactionId?.trim();
    const query = args.query?.trim();

    if (transactionId) {
      const result = await this.searchService.smartSearch({
        transactionId,
        query,
        limit: 5,
      });
      return this.processResult(result, transactionId);
    }

    if (query) {
      const amount = extractFirstAmountFromText(query) ?? undefined;
      const result = await this.searchService.smartSearch({
        query,
        amount,
        limit: amount ? 15 : 10,
      });
      return this.processResult(result, query);
    }

    return this.handleNotFound();
  }

  private processResult(result: any, searchLabel: string): ToolExecutionResult {
    if (result.data.length === 0) {
      return this.handleNotFound();
    }

    if (result.data.length === 1) {
      return this.handleSingleResult(result.data[0]);
    }

    return {
      responseForModel: {
        hint: `Encontrei ${result.data.length} transações que correspondem a "${searchLabel}".`,
        matches: result.data.map((t: any) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount || 0),
          date: t.paymentDate || t.dueDate || t.createdAt,
        })),
        instructionToAi:
          'Peça para o usuário ser mais específico ou escolher pelo ID da lista.',
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Múltiplas transações para "${searchLabel}"`,
        payload: {
          items: result.data.map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: Number(t.amount || 0),
            date: t.paymentDate || t.dueDate || t.createdAt,
            category: t.categoryName || 'Sem categoria',
          })),
          message: 'Encontrei mais de uma transação. Qual delas?',
        },
      },
    };
  }

  private handleSingleResult(result: any): ToolExecutionResult {
    const paymentMethods = [] as any[];
    const splits = Array.isArray(result.splits) ? result.splits : [];

    if (Array.isArray(result.splits) && result.splits.length > 0) {
      paymentMethods.push(
        ...result.splits.map((split: any) => ({
          id: split.id,
          amount: Number(split.amount || 0),
          paymentMethod: split.paymentMethod,
          creditCard: split.creditCard
            ? {
                id: split.creditCard.id,
                name: split.creditCard.name,
                lastFourDigits: split.creditCard.lastFourDigits,
                flag: split.creditCard.flag,
              }
            : undefined,
          debitCard: split.debitCard
            ? {
                id: split.debitCard.id,
                name: split.debitCard.name,
                lastFourDigits: split.debitCard.lastFourDigits,
                flag: split.debitCard.flag,
              }
            : undefined,
        })),
      );
    } else {
      if (result.creditCard) {
        paymentMethods.push({
          amount: Number(result.amount || 0),
          paymentMethod: 'credit_card',
          creditCard: {
            id: result.creditCard.id,
            name: result.creditCard.name,
            lastFourDigits: result.creditCard.lastFourDigits,
            flag: result.creditCard.flag,
          },
        });
      }
      if (result.debitCard) {
        paymentMethods.push({
          amount: Number(result.amount || 0),
          paymentMethod: 'debit',
          debitCard: {
            id: result.debitCard.id,
            name: result.debitCard.name,
            lastFourDigits: result.debitCard.lastFourDigits,
            flag: result.debitCard.flag,
          },
        });
      }
    }

    return {
      responseForModel: {
        transaction: { ...result, paymentMethods, splits },
        instructionToAi:
          'Você recebeu os detalhes da transação. Formule uma resposta breve ao usuário resumindo os dados.',
      },
      visualization: {
        type: 'transaction',
        toolName: this.name,
        title: `Detalhes: ${result.description}`,
        payload: { ...result, paymentMethods, splits },
      },
    };
  }

  private handleNotFound(): ToolExecutionResult {
    return {
      responseForModel: { error: 'Transação não encontrada.' },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: 'Não encontrado',
        payload: { error: 'Nenhuma transação corresponde aos critérios.' },
      },
    };
  }
}
