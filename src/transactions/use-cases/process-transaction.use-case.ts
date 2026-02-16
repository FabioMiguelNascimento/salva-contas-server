import { GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { CategoriesRepositoryInterface } from 'src/categories/categories.interface';
import { AIReceiptSchema } from 'src/schemas/transactions.schema';
import { StorageService } from 'src/storage/storage.service';
import { CreditCardsRepositoryInterface } from '../../credit-cards/credit-cards.interface';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export default class ProcessTransactionUseCase {
  private readonly logger = new Logger(ProcessTransactionUseCase.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    @Inject(CreditCardsRepositoryInterface)
    private readonly creditCardsRepository: CreditCardsRepositoryInterface,
    @Inject(CategoriesRepositoryInterface)
    private readonly categoriesRepository: CategoriesRepositoryInterface,
    private readonly storageService: StorageService,
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async execute(
    file: Express.Multer.File | null,
    textInput: string | null,
    options?: { creditCardId?: string | null; paymentDate?: string | null; dueDate?: string | null }
  ) {
    const now = new Date();

    const brazilDate = now.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const creditCards = await this.creditCardsRepository.getCreditCards({ page: 1, limit: 100, status: 'active' });

    const creditCardsInfo = creditCards.length > 0
      ? `\n\nCARTÕES DE CRÉDITO DISPONÍVEIS:\n${creditCards.map(c => `- ID: "${c.id}" | Nome: ${c.name} | Bandeira: ${c.flag} | Final: ${c.lastFourDigits}`).join('\n')}\n\nSe a compra parecer ter sido feita com cartão de crédito, retorne o "creditCardId" correspondente. Caso contrário, retorne null.`
      : '';

    const categoriesResult = await this.categoriesRepository.getAllCategories({ limit: 100 });
    const categoriesList = categoriesResult?.data ? categoriesResult.data : [];

    const categoriesInfo = categoriesList.length > 0
      ? `\n\nCATEGORIAS DISPONÍVEIS:\n${categoriesList.map((c: any) => `- ID: "${c.id}" | Nome: ${c.name}`).join('\n')}\n\nSe alguma dessas categorias for adequada, retorne exatamente o nome no campo \"category\". Se nenhuma for adequada, gere um nome curto de categoria nova e retorne esse nome em \"category\`.`
      : '';

    const prompt = `
      Atue como um extrator de dados literal. 
      
      DATA DE HOJE PARA REFERÊNCIA: ${brazilDate} (Use apenas para preencher o ano se faltar).

      IMPORTANTE — CATEGORIAS:
      ${categoriesInfo}

      🚨 REGRA DE OURO (DATAS):
      1. Copie a data EXATAMENTE como está impressa. 
      2. Retorne no formato brasileiro "DD/MM/YYYY". 
      3. NÃO converta para o próximo dia útil. Se o boleto vence Domingo dia 10, retorne dia 10.
      4. NÃO converta fuso horário.

      Retorne JSON:
      {
        "amount": number,
        "description": string,
        "category": string,
        "type": "expense" | "income",
        "status": "paid" | "pending",
        "dueDate": "DD/MM/YYYY" (String exata do documento, ex: "10/02/2025"), 
        "paymentDate": "DD/MM/YYYY" (String exata do documento),
        "creditCardId": "uuid..."
      }
    `;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const payload: any[] = [prompt];

    if (file) {
      let finalMimeType = file.mimetype;
      if (file.originalname.toLowerCase().endsWith('.pdf')) {
        finalMimeType = 'application/pdf';
      }

      payload.push({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: finalMimeType
        },
      });
    }

    if (textInput) payload.push(`Contexto: ${textInput}`);

    const result = await model.generateContent(payload);
    const rawText = result.response.text().replace(/```json|```/g, '').trim();

    const validationResult = AIReceiptSchema.safeParse(JSON.parse(rawText));

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

    // Upload do arquivo para o R2 se presente
    let attachmentData: {
      attachmentKey?: string;
      attachmentOriginalName?: string;
      attachmentMimeType?: string;
      attachmentSize?: number;
    } = {};

    if (file) {
      try {
        const fileKey = await this.storageService.uploadFile(file, 'receipts');
        attachmentData = {
          attachmentKey: fileKey,
          attachmentOriginalName: file.originalname,
          attachmentMimeType: file.mimetype,
          attachmentSize: file.size,
        };
      } catch (error) {
        this.logger.warn(`Upload de anexo falhou, continuando sem anexo: ${error}`);
        // Não falha a transação se o upload falhar
      }
    }

    const transaction = await this.transactionsRepository.createTransaction({
      ...data,
      ...attachmentData,
    });

    return transaction;
  }
}