import { GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async execute(
    file: Express.Multer.File | null, 
    textInput: string | null, 
    options?: { creditCardId?: string | null; paymentDate?: string | null; dueDate?: string | null }
  ) {
    // Buscar cartões disponíveis para a IA poder sugerir
    const creditCards = await this.creditCardsRepository.getCreditCards({ page: 1, limit: 100, status: 'active' });
    
    const creditCardsInfo = creditCards.length > 0 
      ? `\n\nCARTÕES DE CRÉDITO DISPONÍVEIS:\n${creditCards.map(c => `- ID: "${c.id}" | Nome: ${c.name} | Bandeira: ${c.flag} | Final: ${c.lastFourDigits}`).join('\n')}\n\nSe a compra parecer ter sido feita com cartão de crédito, retorne o "creditCardId" correspondente. Caso contrário, retorne null.`
      : '';
   
    const prompt = `
      Atue como um especialista financeiro. Analise a imagem ou texto.
      
      REGRAS DE CATEGORIZAÇÃO:
      - Use categorias genéricas em Português (Ex: Alimentação, Transporte, Moradia, Lazer, Saúde, Serviços).
      - Evite nomes de empresas na categoria (Não use "Uber", use "Transporte").
      ${creditCardsInfo}
      Retorne JSON estrito:
      {
        "amount": number,
        "description": string,
        "category": string,
        "type": "expense" | "income",
        "status": "paid" | "pending",
        "dueDate": "YYYY-MM-DD" (ou null),
        "paymentDate": "YYYY-MM-DD" (ou null),
        "creditCardId": "uuid-do-cartao" (ou null)
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

    return this.transactionsRepository.createTransaction(data);
  }
}