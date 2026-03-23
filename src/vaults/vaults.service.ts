import {
    BadRequestException,
    Injectable,
    NotFoundException,
    Scope,
} from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    CreateVaultInput,
    UpdateVaultInput,
    VaultAmountInput,
} from 'src/schemas/vaults.schema';
import { UserContext } from '../auth/user-context.service';

const VAULT_CATEGORY_NAME = 'Cofrinho';
const DEPOSIT_PREFIX = 'Depósito no cofrinho:';
const WITHDRAW_PREFIX = 'Resgate do cofrinho:';
const YIELD_PREFIX = 'Rendimento manual no cofrinho:';

@Injectable({ scope: Scope.REQUEST })
export class VaultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  private get actorUserId(): string {
    return this.userContext.actorUserId;
  }

  private async getVaultOrThrow(id: string) {
    const vault = await this.prisma.vault.findFirst({
      where: {
        id,
        userId: this.userId,
      },
    });

    if (!vault) {
      throw new NotFoundException('Cofrinho não encontrado');
    }

    return vault;
  }

  private async getOrCreateVaultCategoryId(tx: Prisma.TransactionClient) {
    const existing = await tx.category.findFirst({
      where: {
        userId: this.userId,
        name: VAULT_CATEGORY_NAME,
      },
      select: { id: true },
    });

    if (existing?.id) {
      return existing.id;
    }

    const created = await tx.category.create({
      data: {
        userId: this.userId,
        name: VAULT_CATEGORY_NAME,
        icon: 'piggy-bank',
      },
      select: { id: true },
    });

    return created.id;
  }

  async findAll() {
    return this.prisma.vault.findMany({
      where: {
        userId: this.userId,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async create(data: CreateVaultInput) {
    return this.prisma.vault.create({
      data: {
        name: data.name,
        targetAmount: data.targetAmount ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
        userId: this.userId,
      },
    });
  }

  async update(id: string, data: UpdateVaultInput) {
    await this.getVaultOrThrow(id);

    return this.prisma.vault.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.targetAmount !== undefined
          ? { targetAmount: data.targetAmount }
          : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
      },
    });
  }

  async remove(id: string) {
    const vault = await this.getVaultOrThrow(id);

    if (Number(vault.currentAmount) > 0) {
      throw new BadRequestException(
        'Não é possível excluir um cofrinho com saldo maior que zero',
      );
    }

    await this.prisma.vault.delete({
      where: { id },
    });
  }

  async deposit(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({
        where: {
          id,
          userId: this.userId,
        },
      });

      if (!vault) {
        throw new NotFoundException('Cofrinho não encontrado');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: {
            increment: input.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.actorUserId,
          amount: input.amount,
          description: `${DEPOSIT_PREFIX} ${vault.name}`,
          category: VAULT_CATEGORY_NAME,
          categoryName: VAULT_CATEGORY_NAME,
          categoryId,
          type: 'expense',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      return updatedVault;
    });
  }

  async withdraw(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({
        where: {
          id,
          userId: this.userId,
        },
      });

      if (!vault) {
        throw new NotFoundException('Cofrinho não encontrado');
      }

      if (Number(vault.currentAmount) < input.amount) {
        throw new BadRequestException('Saldo insuficiente no cofrinho');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: {
            decrement: input.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.actorUserId,
          amount: input.amount,
          description: `${WITHDRAW_PREFIX} ${vault.name}`,
          category: VAULT_CATEGORY_NAME,
          categoryName: VAULT_CATEGORY_NAME,
          categoryId,
          type: 'income',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      return updatedVault;
    });
  }

  async addYield(id: string, input: VaultAmountInput) {
    return this.prisma.$transaction(async (tx) => {
      const vault = await tx.vault.findFirst({
        where: {
          id,
          userId: this.userId,
        },
      });

      if (!vault) {
        throw new NotFoundException('Cofrinho não encontrado');
      }

      const categoryId = await this.getOrCreateVaultCategoryId(tx);

      const updatedVault = await tx.vault.update({
        where: { id },
        data: {
          currentAmount: {
            increment: input.amount,
          },
        },
      });

      await tx.transaction.create({
        data: {
          userId: this.userId,
          createdById: this.actorUserId,
          amount: input.amount,
          description: `${YIELD_PREFIX} ${vault.name}`,
          category: VAULT_CATEGORY_NAME,
          categoryName: VAULT_CATEGORY_NAME,
          categoryId,
          type: 'income',
          status: 'paid',
          paymentDate: new Date(),
          vaultId: vault.id,
        },
      });

      return updatedVault;
    });
  }
}
