import { Injectable } from '@nestjs/common';
import { IdempotencyRepository } from './idempotency.repository';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class IdempotencyService {
  constructor(private readonly repo: IdempotencyRepository) {}

  async lookup(key: string): Promise<{ statusCode: number; response: string } | null> {
    const record = await this.repo.find(key);
    if (!record) return null;
    return { statusCode: record.statusCode, response: record.response };
  }

  async save(
    key: string,
    method: string,
    path: string,
    bodyHash: string | null,
    statusCode: number,
    response: string,
    ttlMs: number = DEFAULT_TTL_MS,
  ) {
    return this.repo.create(key, method, path, bodyHash, statusCode, response, ttlMs);
  }

  async cleanup() {
    const result = await this.repo.deleteExpired();
    return result.count;
  }
}
