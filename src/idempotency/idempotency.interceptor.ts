import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, of, lastValueFrom, tap, catchError } from 'rxjs';
import { createHash } from 'crypto';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    const idempotencyKey = req.header('Idempotency-Key');

    if (!idempotencyKey) {
      return next.handle();
    }

    const cached = await this.idempotencyService.lookup(idempotencyKey);
    if (cached) {
      const res = context.switchToHttp().getResponse<Response>();
      res.status(cached.statusCode);
      const parsed = JSON.parse(cached.response);
      return of(parsed);
    }

    let bodyHash: string | null = null;
    if (req.body) {
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      bodyHash = createHash('sha256').update(raw).digest('hex');
    }

    return next.handle().pipe(
      tap(async (data) => {
        await this.idempotencyService.save(
          idempotencyKey,
          req.method,
          req.url,
          bodyHash,
          200,
          JSON.stringify(data ?? null),
        );
      }),
      catchError(async (error) => {
        const statusCode = error?.status ?? error?.response?.status ?? 500;
        const response = error?.response?.data ?? { message: error.message ?? 'Erro interno' };
        await this.idempotencyService.save(
          idempotencyKey,
          req.method,
          req.url,
          bodyHash,
          statusCode,
          JSON.stringify(response ?? null),
        );
        return of(error);
      }),
    );
  }
}
