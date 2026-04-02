import { Inject, Injectable, Scope } from '@nestjs/common';
import { ToolTransactionDetailsArgsSchema } from 'src/schemas/ai-advisor.schema';
import { TransactionsRepositoryInterface } from 'src/transactions/transactions.interface';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class GetTransactionDetailsToolUseCase extends BaseAiTool<
  typeof ToolTransactionDetailsArgsSchema
> {
  readonly name = 'get_transaction_details';
  readonly description =
    'Retorna detalhes de uma transação. Se houver mais de uma correspondência para o texto, retorna uma lista para escolha.';
  readonly schema = ToolTransactionDetailsArgsSchema;

  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolTransactionDetailsArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const transactionId = args.transactionId?.trim();
    const query = args.query?.trim();

    if (transactionId) {
      const result =
        await this.transactionsRepository.getTransactionById(transactionId);
      if (result) {
        return this.handleSingleResult(result);
      }

      const fallbackSearch = await this.transactionsRepository.getTransactions({
        page: 1,
        limit: 5,
        query: transactionId,
      });
      if (fallbackSearch.data.length > 0) {
        if (fallbackSearch.data.length === 1) {
          return this.handleSingleResult(fallbackSearch.data[0]);
        }

        return {
          responseForModel: {
            error:
              'Múltiplas transações encontradas para esse identificador. Selecione uma das opções abaixo.',
            matches: fallbackSearch.data.map((t) => ({
              id: t.id,
              description: t.description,
              amount: t.amount,
              date: t.paymentDate || t.createdAt,
            })),
          },
          visualization: {
            type: 'table_summary',
            toolName: this.name,
            title: `Múltiplas transações para "${transactionId}"`,
            payload: {
              items: fallbackSearch.data.map((t) => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount || 0),
                date: t.paymentDate || t.createdAt,
                category: t.categoryName || 'Sem categoria',
              })),
              message:
                'Encontrei mais de uma transação com esse identificador. Qual delas você deseja ver?',
            },
          },
        };
      }

      return this.handleNotFound();
    }

    if (query) {
      const search = await this.transactionsRepository.getTransactions({
        page: 1,
        limit: 5,
        query,
      });

      if (search.data.length === 0) {
        return this.handleNotFound();
      }

      if (search.data.length > 1) {
        return {
          responseForModel: {
            error:
              'Múltiplas transações encontradas. Peça para o usuário ser mais específico ou escolher pelo ID da lista fornecida.',
            matches: search.data.map((t) => ({
              id: t.id,
              description: t.description,
              amount: t.amount,
              date: t.paymentDate || t.createdAt,
            })),
          },
          visualization: {
            type: 'table_summary',
            toolName: this.name,
            title: `Múltiplas transações para "${args.query}"`,
            payload: {
              items: search.data.map((t) => ({
                id: t.id,
                description: t.description,
                amount: Number(t.amount || 0),
                date: t.paymentDate || t.createdAt,
                category: t.categoryName || 'Sem categoria',
              })),
              message:
                'Encontrei mais de uma transação com esse nome. Qual delas você deseja ver?',
            },
          },
        };
      }

      return this.handleSingleResult(search.data[0]);
    }

    return this.handleNotFound();
  }

  private handleSingleResult(result: any): ToolExecutionResult {
    if (!result) return this.handleNotFound();

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
      // fallback para cartão direto na transação
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
        transaction: {
          ...result,
          paymentMethods,
          splits,
        },
        instructionToAi:
          'Você recebeu os detalhes da transação. Formule uma resposta breve ao usuário resumindo os dados e sugerindo próximo passo (ex: verificar outra transação ou analisar orçamento).',
      },
      visualization: {
        type: 'transaction',
        toolName: this.name,
        title: `Detalhes: ${result.description}`,
        payload: {
          ...result,
          paymentMethods,
          splits,
        },
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
