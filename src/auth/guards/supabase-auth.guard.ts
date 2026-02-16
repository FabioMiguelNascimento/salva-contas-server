import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
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

    request['user'] = user;

    const workspaceId = await this.extractAndValidateWorkspace(request, user.id);
    request['workspaceId'] = workspaceId;

    return true;
  }

  private async extractAndValidateWorkspace(request: Request, userId: string): Promise<string> {
    const workspaceIdFromHeader = request.headers['x-workspace-id'] as string;

    if (workspaceIdFromHeader) {
      const membership = await this.prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspaceId: workspaceIdFromHeader,
        },
      });

      if (!membership) {
        throw new ForbiddenException('Você não tem acesso a este workspace');
      }

      // atualiza lastAccessed
      await this.prisma.workspaceMember.updateMany({
        where: { userId, workspaceId: workspaceIdFromHeader },
        data: { lastAccessed: new Date() },
      });

      return workspaceIdFromHeader;
    }

    const firstMembership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
    });

    if (firstMembership) {
      // atualiza lastAccessed
      await this.prisma.workspaceMember.updateMany({
        where: { id: firstMembership.id },
        data: { lastAccessed: new Date() },
      });

      return firstMembership.workspaceId;
    }

    const existingMembership = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      include: { workspace: true },
    });

    if (existingMembership) {
      return existingMembership.workspaceId;
    }

    try {
      const defaultWorkspace = await this.prisma.workspace.create({
        data: {
          name: 'Workspace',
          members: {
            create: {
              userId,
              role: 'ADMIN',
              lastAccessed: new Date(),
            },
          },
        },
      });

      return defaultWorkspace.id;
    } catch (error) {
      const fallbackMembership = await this.prisma.workspaceMember.findFirst({
        where: { userId },
      });

      if (fallbackMembership) {
        return fallbackMembership.workspaceId;
      }

      throw error;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
