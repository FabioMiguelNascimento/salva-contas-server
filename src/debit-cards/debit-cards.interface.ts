import type { DebitCard } from '../../generated/prisma/client';
import {
  CreateDebitCardInput,
  GetDebitCardsInput,
  UpdateDebitCardInput,
} from '../schemas/debit-cards.schema';

export abstract class DebitCardsRepositoryInterface {
  abstract createDebitCard(data: CreateDebitCardInput): Promise<DebitCard>;
  abstract getDebitCards(filters?: GetDebitCardsInput): Promise<DebitCard[]>;
  abstract getDebitCardById(id: string): Promise<DebitCard | null>;
  abstract updateDebitCard(
    id: string,
    data: UpdateDebitCardInput,
  ): Promise<DebitCard>;
  abstract deleteDebitCard(id: string): Promise<void>;
}
