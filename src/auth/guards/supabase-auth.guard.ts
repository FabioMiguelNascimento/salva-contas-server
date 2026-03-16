import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    const user = await this.supabaseService.validateToken(token);

    if (!user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const localUser = await this.prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.user_metadata?.name ?? null,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name ?? null,
      },
    });

    request['user'] = user;
    request['localUser'] = localUser;
    request['targetUserId'] = localUser.linkedToId ?? localUser.id;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
