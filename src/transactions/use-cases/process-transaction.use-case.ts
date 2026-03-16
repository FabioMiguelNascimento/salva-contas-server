import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { CategoriesRepositoryInterface } from 'src/categories/categories.interface';
import { GEN_AI_SERVICE, GenAIServiceInterface } from 'src/gen-ai/gen-ai.interface';
import { PrismaService } from 'src/prisma/prisma.service';
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
    private readonly userContext: UserContext,
    private readonly prisma: PrismaService,
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

    const documentHint = file?.originalname
      ? `\nARQUIVO: ${file.originalname}`
      : (textInput ? `\nENTRADA DE TEXTO: ${textInput.slice(0, 250)}` : '');

    const familyMembers = await this.getFamilyMembersForPrompt();
    const familyMembersInfo = familyMembers.length > 0
      ? `\nMEMBROS DA CONTA (use createdById somente com IDs desta lista quando o texto indicar "quem fez" a transacao):\n${familyMembers
          .map((member, index) => `${index + 1}. ${member.id}|${member.name || 'Sem nome'}|${member.email || 'Sem email'}`)
          .join('\n')}`
      : '';

    const prompt = `
      Extraia dados financeiros e retorne SOMENTE JSON valido, sem markdown.
      DATA DE HOJE: ${brazilDate} (use somente para completar ano faltante).
      ${documentHint}
      Datas devem manter valor literal do documento em DD/MM/YYYY.
      ${categoriesInfo}
      ${creditCardsInfo}
      ${familyMembersInfo}

      Regras:
      - Pagamento unico: use creditCardId (ou null) e nao envie splits.
      - Pagamento dividido: envie splits e nao envie creditCardId na raiz.
      - splits[].paymentMethod: credit_card|debit|pix|cash|transfer|other
      - Soma de splits deve bater com amount.
      - Se for EXTRATO com varias linhas, retorne um ARRAY de objetos (um por transacao).
      - Em extrato, cada objeto deve ter paymentDate proprio da linha correspondente.
      - NUNCA copie a data inicial/final do periodo para todas as transacoes.
      - Se nao houver data da linha, use paymentDate null para aquele item.
      - Se o texto deixar claro quem criou a transacao, retorne createdById com um ID da lista de membros.
      - Se nao estiver claro, retorne createdById como null.

      JSON de saida:
      Objeto unico (comprovante simples):
      {
        "amount": number,
        "description": string,
        "category": string,
        "type": "expense" | "income",
        "status": "paid" | "pending",
        "dueDate": "DD/MM/YYYY" | null,
        "paymentDate": "DD/MM/YYYY" | null,
        "creditCardId": "uuid" | null,
        "createdById": "uuid" | null,
        "splits": [ { "amount": number, "paymentMethod": string, "creditCardId": "uuid" | null } ]
      }
      ou ARRAY desse mesmo objeto para extrato multiplo.
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

    parsedJson = this.normalizeAiPayload(parsedJson);

    const candidates = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
    const validData: Array<any> = [];

    for (const candidate of candidates) {
      const validationResult = AIReceiptSchema.safeParse(candidate);
      if (!validationResult.success) {
        continue;
      }
      validData.push(validationResult.data);
    }

    if (validData.length === 0) {
      throw new BadRequestException('A IA falhou em gerar dados válidos.');
    }

    const attachmentData = await uploadAttachmentPromise;
    const createdTransactions: any[] = [];

    for (const [index, data] of validData.entries()) {
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

      data.createdById = await this.resolveCreatedById(data.createdById ?? null);

      // If splits sum doesn't match amount (floating point rounding), normalize the largest slice
      if (data.splits && data.splits.length >= 2) {
        const splitSum = data.splits.reduce((s, sp) => s + sp.amount, 0);
        const diff = Math.round((data.amount - splitSum) * 100) / 100;
        if (Math.abs(diff) > 0 && Math.abs(diff) < 1) {
          const maxIdx = data.splits.reduce((mi, sp, i, arr) => sp.amount > arr[mi].amount ? i : mi, 0);
          data.splits[maxIdx].amount = Math.round((data.splits[maxIdx].amount + diff) * 100) / 100;
        }
      }

      const transaction = await this.transactionsRepository.createTransaction({
        ...data,
        ...(index === 0 ? attachmentData : {}),
      });

      createdTransactions.push(transaction);
    }

    return createdTransactions.length === 1 ? createdTransactions[0] : createdTransactions;
  }

  private normalizeAiPayload(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input
        .map((item) => this.normalizeAiPayload(item))
        .filter((item) => !!item && typeof item === 'object');
    }

    if (!input || typeof input !== 'object') {
      return input;
    }

    const source = input as Record<string, any>;

    if (source.data && typeof source.data === 'object') {
      // Also support wrapped formats like { data: { ... } } or { data: [{ ... }] }.
      return this.normalizeAiPayload(source.data);
    }

    const payload = { ...source };
    const splits = payload.splits;

    if (payload.createdById === '') {
      payload.createdById = null;
    }

    if (splits == null) {
      delete payload.splits;
      return payload;
    }

    if (!Array.isArray(splits)) {
      delete payload.splits;
      return payload;
    }

    if (splits.length === 0) {
      delete payload.splits;
      return payload;
    }

    // AI occasionally returns a single split item; treat it as single payment.
    if (Array.isArray(splits) && splits.length === 1) {
      const first = splits[0] || {};
      if (!payload.creditCardId && first.paymentMethod === 'credit_card' && first.creditCardId) {
        payload.creditCardId = first.creditCardId;
      }
      delete payload.splits;
    }

    return payload;
  }

  private async getFamilyMembersForPrompt() {
    const ownerId = this.userContext.userId;

    return this.prisma.user.findMany({
      where: {
        OR: [{ id: ownerId }, { linkedToId: ownerId }],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async resolveCreatedById(requestedCreatedById: string | null) {
    const actorUserId = this.userContext.actorUserId;

    if (!requestedCreatedById) {
      return actorUserId;
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, linkedToId: true },
    });

    if (!actor) {
      throw new BadRequestException('Usuário autenticado não encontrado.');
    }

    const ownerId = actor.linkedToId ?? actor.id;
    const members = await this.prisma.user.findMany({
      where: {
        OR: [{ id: ownerId }, { linkedToId: ownerId }],
      },
      select: { id: true },
    });

    const allowedMemberIds = new Set(members.map((member) => member.id));
    if (!allowedMemberIds.has(requestedCreatedById)) {
      throw new BadRequestException('createdById inválido para esta conta compartilhada.');
    }

    const actorIsOwner = actor.id === ownerId;
    if (!actorIsOwner && requestedCreatedById !== actor.id) {
      throw new BadRequestException('Somente o dono da conta pode registrar em nome de outro membro.');
    }

    return requestedCreatedById;
  }
}