import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { CategoriesRepositoryInterface } from 'src/categories/categories.interface';
import { GEN_AI_SERVICE, GenAIServiceInterface } from 'src/gen-ai/gen-ai.interface';
import { AIReceiptSchema } from 'src/schemas/transactions.schema';
import { StorageService } from 'src/storage/storage.service';
import { CreditCardsRepositoryInterface } from '../../credit-cards/credit-cards.interface';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export default class ProcessTransactionUseCase {
  private readonly logger = new Logger(ProcessTransactionUseCase.name);
  private readonly maxCreditCardsInPrompt = Number(process.env.GEMINI_TRANSACTION_CARDS_LIMIT || 20);
  private readonly maxCategoriesInPrompt = Number(process.env.GEMINI_TRANSACTION_CATEGORIES_LIMIT || 30);

  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    @Inject(CreditCardsRepositoryInterface)
    private readonly creditCardsRepository: CreditCardsRepositoryInterface,
    @Inject(CategoriesRepositoryInterface)
    private readonly categoriesRepository: CategoriesRepositoryInterface,
    private readonly storageService: StorageService,
    @Inject(GEN_AI_SERVICE)
    private readonly genAIService: GenAIServiceInterface,
  ) {}

  async execute(
    file: Express.Multer.File | null,
    textInput: string | null,
    options?: { creditCardId?: string | null; paymentDate?: string | null; dueDate?: string | null }
  ) {
    if (!file && !textInput?.trim()) {
      throw new BadRequestException('Envie um arquivo ou texto para processamento da transação.');
    }

    const now = new Date();

    const brazilDate = now.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const includeCreditCardsInPrompt = !options?.creditCardId;

    const uploadAttachmentPromise = file
      ? this.storageService
          .uploadFile(file, 'receipts')
          .then((fileKey) => ({
            attachmentKey: fileKey,
            attachmentOriginalName: file.originalname,
            attachmentMimeType: file.mimetype,
            attachmentSize: file.size,
          }))
          .catch((error) => {
            this.logger.warn(`Upload de anexo falhou ${error}`);
            throw new ConflictException("Falha ao processar anexo");
          })
      : Promise.resolve({});

    const [creditCards, categoriesResult] = await Promise.all([
      includeCreditCardsInPrompt
        ? this.creditCardsRepository.getCreditCards({ page: 1, limit: this.maxCreditCardsInPrompt, status: 'active' })
        : Promise.resolve([]),
      this.categoriesRepository.getAllCategories({ limit: this.maxCategoriesInPrompt }),
    ]);

    const creditCardsInfo = includeCreditCardsInPrompt && creditCards.length > 0
      ? `\nCARTOES:\n${creditCards.map(c => `${c.id}|${c.name}|${c.flag}|${c.lastFourDigits}`).join('\n')}\nUse creditCardId apenas quando pagamento for cartao de credito.`
      : '';

    const categoriesList = categoriesResult?.data ? categoriesResult.data : [];

    const categoriesInfo = categoriesList.length > 0
      ? `\nCATEGORIAS:\n${categoriesList.map((c: any) => c.name).join(', ')}\nRetorne category com nome de categoria existente quando possivel.`
      : '';

    const prompt = `
      Extraia dados financeiros e retorne SOMENTE JSON valido, sem markdown.
      DATA DE HOJE: ${brazilDate} (use somente para completar ano faltante).
      Datas devem manter valor literal do documento em DD/MM/YYYY.
      ${categoriesInfo}
      ${creditCardsInfo}

      Regras:
      - Pagamento unico: use creditCardId (ou null) e nao envie splits.
      - Pagamento dividido: envie splits e nao envie creditCardId na raiz.
      - splits[].paymentMethod: credit_card|debit|pix|cash|transfer|other
      - Soma de splits deve bater com amount.

      JSON de saida:
      {
        "amount": number,
        "description": string,
        "category": string,
        "type": "expense" | "income",
        "status": "paid" | "pending",
        "dueDate": "DD/MM/YYYY" | null,
        "paymentDate": "DD/MM/YYYY" | null,
        "creditCardId": "uuid" | null,
        "splits": [ { "amount": number, "paymentMethod": string, "creditCardId": "uuid" | null } ]
      }
    `;

    let rawText = '';
    try {
      rawText = await this.genAIService.generateStructuredJson({
        prompt,
        textInput,
        file: file
          ? {
              buffer: file.buffer,
              mimetype: file.mimetype,
              originalname: file.originalname,
            }
          : null,
      });
    } catch (error) {
      this.logger.error('Falha no layer de GenAI ao extrair dados da transacao', error as any);
      throw error;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new BadRequestException('A IA retornou um formato inválido (JSON malformado).');
    }

    const validationResult = AIReceiptSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error(validationResult.error);
      throw new BadRequestException('A IA falhou em gerar dados válidos.');
    }

    const data = validationResult.data;

    if (options?.creditCardId) {
      data.creditCardId = options.creditCardId;
    }

    // Keep dates as strings (AI returns DD/MM/YYYY). The repository will parse them via parseDateLocal.
    if (options?.paymentDate !== undefined) {
      data.paymentDate = options.paymentDate;
    }

    if (options?.dueDate !== undefined) {
      data.dueDate = options.dueDate;
    }

    // If splits sum doesn't match amount (floating point rounding), normalize the largest slice
    if (data.splits && data.splits.length >= 2) {
      const splitSum = data.splits.reduce((s, sp) => s + sp.amount, 0);
      const diff = Math.round((data.amount - splitSum) * 100) / 100;
      if (Math.abs(diff) > 0 && Math.abs(diff) < 1) {
        const maxIdx = data.splits.reduce((mi, sp, i, arr) => sp.amount > arr[mi].amount ? i : mi, 0);
        data.splits[maxIdx].amount = Math.round((data.splits[maxIdx].amount + diff) * 100) / 100;
      }
    }

    const attachmentData = await uploadAttachmentPromise;

    const transaction = await this.transactionsRepository.createTransaction({
      ...data,
      ...attachmentData,
    });

    return transaction;
  }
}