import { Injectable, Scope } from '@nestjs/common';
import { ToolDeleteTransactionArgsSchema } from 'src/schemas/ai-advisor.schema';
import { extractFirstAmountFromText } from 'src/utils/amount-parser';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';
import { TransactionSearchService } from '../../services/transaction-search.service';
import { TransactionsRepositoryInterface } from 'src/transactions/transactions.interface';

@Injectable({ scope: Scope.REQUEST })
export class DeleteTransactionToolUseCase extends BaseAiTool<
  typeof ToolDeleteTransactionArgsSchema
> {
  readonly name = 'delete_transaction';
  readonly description =
    'Deleta uma transação. Passe o transactionId exato OU use o campo "query" com texto livre (descrição, valor como "131,11", etc.). A ferramenta busca automaticamente no banco e exibe preview. Você DEVE enviar "confirm: false" na primeira chamada para gerar card de revisão; só envie "confirm: true" após o usuário aprovar.';
  readonly schema = ToolDeleteTransactionArgsSchema;

  constructor(
    private readonly searchService: TransactionSearchService,
    private readonly transactionsRepository: TransactionsRepositoryInterface,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolDeleteTransactionArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const transactionId = args.transactionId?.trim();
    const query = args.query?.trim();
    const confirm = args.confirm;

    let transactionData;

    if (transactionId) {
      const result = await this.searchService.smartSearch({
        transactionId,
        limit: 1,
      });
      transactionData = result.data[0];
    } else if (query) {
      const amount = extractFirstAmountFromText(query) ?? undefined;

      const result = await this.searchService.smartSearch({
        query,
        amount,
        limit: amount ? 15 : 5,
      });

      if (result.data.length === 0) {
        return this.handleNotFound(query);
      }

      if (result.data.length === 1) {
        transactionData = result.data[0];
      } else {
        return this.handleMultipleResults(result, query);
      }
    }

    if (!transactionData) {
      return this.handleNotFound(query);
    }

    if (!confirm) {
      return this.buildPreview(transactionData);
    }

    return this.buildDeleted(transactionData);
  }

  private formatTx(tx: any) {
    return {
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount || 0),
      date: tx.paymentDate || tx.dueDate || tx.createdAt,
      category: tx.categoryName || 'Sem categoria',
    };
  }

  private handleNotFound(query?: string): ToolExecutionResult {
    return {
      responseForModel: { error: query ? `Nenhuma transação encontrada para "${query}".` : 'Transação não encontrada.' },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: 'Não encontrado',
        payload: { error: 'Nenhuma transação corresponde aos critérios.' },
      },
    };
  }

  private handleMultipleResults(
    result: { data: any[] },
    query: string,
  ): ToolExecutionResult {
    return {
      responseForModel: {
        hint: `Encontrei ${result.data.length} transações que podem corresponder a "${query}". Escolha uma pelo ID.`,
        matches: result.data.map(this.formatTx),
        instructionToAi:
          'Apresente as transações encontradas ao usuário e peça para ele escolher qual deseja deletar.',
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Múltiplas transações para "${query}"`,
        payload: {
          items: result.data.map(this.formatTx),
          message: `Encontrei ${result.data.length} transações. Qual delas você deseja deletar?`,
        },
      },
    };
  }

  private buildPreview(tx: any): ToolExecutionResult {
    return {
      responseForModel: {
        transaction: this.formatTx(tx),
        instructionToAi:
          'Mostre ao usuário o preview da transação que será deletada e peça confirmação. Diga algo como "Encontrei essa transação, posso deletar?" de forma natural.',
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Deletar: ${tx.description}`,
        payload: {
          ...tx,
          requiresConfirmation: true,
          deleteOperation: true,
        },
      },
    };
  }

  private buildDeleted(tx: any): ToolExecutionResult {
    this.transactionsRepository.deleteTransaction(tx.id).then();

    return {
      responseForModel: {
        success: true,
        description: tx.description,
        amount: Number(tx.amount || 0),
        instructionToAi: 'Informe ao usuário que a transação foi deletada com sucesso. Seja breve e amigável. NÃO mencione o ID na resposta.',
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Deletada: ${tx.description}`,
        payload: {
          success: true,
          deletedTransaction: {
            id: tx.id,
            description: tx.description,
            amount: Number(tx.amount || 0),
          },
          message: 'Transação deletada com sucesso.',
        },
      },
    };
  }
}
