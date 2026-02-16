import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserContext } from '../../auth/user-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesRepositoryInterface } from '../workspaces.interface';

@Injectable()
export class InviteMemberUseCase {
  constructor(
    @Inject(WorkspacesRepositoryInterface)
    private readonly workspacesRepository: WorkspacesRepositoryInterface,
    private readonly userContext: UserContext,
    private readonly prisma: PrismaService,
  ) {}

  async execute(data: {
    workspaceId: string;
    userId: string;
    role?: 'ADMIN' | 'MEMBER';
  }) {
    // Verifica se o usuário atual é ADMIN do workspace
    const membership = await this.workspacesRepository.getMembership(
      data.workspaceId,
      this.userContext.userId,
    );

    if (!membership) {
      throw new NotFoundException('Workspace não encontrado');
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem convidar membros',
      );
    }

    const created = await this.workspacesRepository.addMember({
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role ?? 'MEMBER',
    });

    // Cria notificação para o usuário convidado
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: data.workspaceId } });
      const title = 'Você foi adicionado a um workspace';
      const message = workspace ? `Você foi adicionado ao workspace "${workspace.name}".` : 'Você foi adicionado a um workspace.';

      await this.prisma.notification.create({
        data: {
          workspaceId: data.workspaceId,
          userId: data.userId,
          title,
          message,
          type: 'general',
        },
      });
    } catch (err) {
      // não falhar o convite por conta da notificação; log e continue
      // eslint-disable-next-line no-console
      console.warn('Failed to create invite notification:', err);
    }

    return created;
  }
}
