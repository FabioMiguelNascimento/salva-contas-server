import { GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { AttachmentsRepositoryInterface, StorageServiceInterface } from 'src/attachments/attachments.interface';
import { AIReceiptSchema } from 'src/schemas/transactions.schema';
import { parseDateLocal } from 'src/utils/date-utils';
import { CreditCardsRepositoryInterface } from '../../credit-cards/credit-cards.interface';
import { TransactionsRepositoryInterface } from '../transactions.interface';

@Injectable()
export default class ProcessTransactionUseCase {
  private genAI: GoogleGenerativeAI;

  constructor(
    @Inject(TransactionsRepositoryInterface)
    private readonly transactionsRepository: TransactionsRepositoryInterface,
    @Inject(CreditCardsRepositoryInterface)
    private readonly creditCardsRepository: CreditCardsRepositoryInterface,
    @Inject(StorageServiceInterface)
    private readonly storageService: StorageServiceInterface,
    @Inject(AttachmentsRepositoryInterface)
    private readonly attachmentsRepository: AttachmentsRepositoryInterface,
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

    const prompt = `
      Atue como um extrator de dados literal. 
      
      DATA DE HOJE PARA REFERÊNCIA: ${brazilDate} (Use apenas para preencher o ano se faltar).

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

    if (options?.paymentDate) {
      data.paymentDate = parseDateLocal(options.paymentDate);
    } else if (data.paymentDate) {
      data.paymentDate = parseDateLocal(data.paymentDate as any);
    }

    if (options?.dueDate) {
      data.dueDate = parseDateLocal(options.dueDate);
    } else if (data.dueDate) {
      data.dueDate = parseDateLocal(data.dueDate as any);
    }

    const transaction = await this.transactionsRepository.createTransaction(data);

    if (file) {
      try {
        const fileType = this.determineFileType(file.mimetype);

        let finalBuffer = file.buffer;
        let finalMimeType = file.mimetype;
        let finalSize = file.size;

        if (file.mimetype.startsWith('image/')) {
          const compressedImage = await sharp(file.buffer)
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 85 })
            .toBuffer();

          finalBuffer = compressedImage;
          finalMimeType = 'image/jpeg';
          finalSize = compressedImage.length;

          console.log(`Imagem comprimida: ${file.size} bytes → ${finalSize} bytes (${Math.round((1 - finalSize / file.size) * 100)}% redução)`);
        }

        const { fileName, url } = await this.storageService.uploadFile(
          {
            buffer: finalBuffer,
            originalName: file.originalname,
            mimeType: finalMimeType,
            size: finalSize,
          },
          transaction.userId,
        );

        await this.attachmentsRepository.createAttachment({
          fileName,
          originalName: file.originalname,
          fileSize: finalSize,
          mimeType: finalMimeType,
          storageUrl: url,
          type: fileType,
          transactionId: transaction.id,
          description: 'Comprovante processado automaticamente',
        });
      } catch (error) {
        console.error('Erro ao salvar arquivo no bucket:', error);
      }
    }

    return transaction;
  }

  private determineFileType(mimeType: string): 'pdf' | 'image' | 'document' {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    return 'document';
  }
}