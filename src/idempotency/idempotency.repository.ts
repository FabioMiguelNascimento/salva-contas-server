import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(key: string) {
    const record = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!record) return null;
    if (record.expiresAt < new Date()) {
      await this.prisma.idempotencyKey.delete({ where: { key } });
      return null;
    }
    return record;
  }

  async create(key: string, method: string, path: string, bodyHash: string | null, statusCode: number, response: string, ttlMs: number) {
    return this.prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        method,
        path,
        bodyHash,
        statusCode,
        response,
        expiresAt: new Date(Date.now() + ttlMs),
      },
      update: {
        statusCode,
        response,
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
  }

  async deleteExpired() {
    return this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
