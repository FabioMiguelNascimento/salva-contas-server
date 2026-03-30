import { Vault } from 'generated/prisma/client';
import {
  CreateVaultInput,
  GetVaultHistoryInput,
  UpdateVaultInput,
  VaultAiActionInput,
  VaultAmountInput,
} from 'src/schemas/vaults.schema';

export abstract class VaultsRepositoryInterface {
  abstract findAll(): Promise<Vault[]>;
  abstract getVaultById(id: string): Promise<Vault | null>;
  abstract getVaultByName(name: string): Promise<Vault | null>;
  abstract create(data: CreateVaultInput): Promise<Vault>;
  abstract update(id: string, data: UpdateVaultInput): Promise<Vault>;
  abstract delete(id: string): Promise<void>;
  abstract deposit(id: string, input: VaultAmountInput): Promise<Vault>;
  abstract withdraw(id: string, input: VaultAmountInput): Promise<Vault>;
  abstract addYield(id: string, input: VaultAmountInput): Promise<Vault>;
  abstract getHistory(id: string, query: GetVaultHistoryInput): Promise<any>;
}
