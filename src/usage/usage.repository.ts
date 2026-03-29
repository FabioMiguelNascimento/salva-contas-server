import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsageRepositoryInterface } from './usage.interface';

@Injectable()
export class UsageRepository extends UsageRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByUserId(userId: string) {
    return this.prisma.subscriptionUsage.findUnique({
      where: { userId },
    });
  }

  async upsertUsage(userId: string, month: number, year: number) {
    return this.prisma.subscriptionUsage.upsert({
      where: { userId },
      create: {
        userId,
        month,
        year,
        aiInteractionsCount: 0,
        receiptsCount: 0,
      },
      update: {
        month,
        year,
        aiInteractionsCount: 0,
        receiptsCount: 0,
      },
    });
  }

  async incrementUsage(
    userId: string,
    feature: 'aiInteractionsCount' | 'receiptsCount',
  ) {
    return this.prisma.subscriptionUsage.update({
      where: { userId },
      data: {
        [feature]: { increment: 1 },
      },
    });
  }
}
