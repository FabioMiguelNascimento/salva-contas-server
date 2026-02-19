import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../auth/supabase.service';
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
    private readonly supabaseService: SupabaseService,
  ) {}

  async execute(data: {
    workspaceId: string;
    userId?: string;
    email?: string;
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

    let targetUserId = data.userId;

    if (!targetUserId && data.email) {
      // procura usuário no Supabase pelo email (admin client)
      const client = this.supabaseService.getAdminClient();
      try {
        const list = await client.auth.admin.listUsers();
        const found = list.data?.users?.find((u: any) => u.email === data.email);
        if (!found) {
          throw new NotFoundException('Usuário com esse email não encontrado');
        }
        targetUserId = found.id;
      } catch (err) {
        // repassa erro
        throw err;
      }
    }

    if (!targetUserId) {
      throw new NotFoundException('userId ou email válido é necessário');
    }

    // captura snapshot de nome/email do Supabase (se disponível) e persiste no membership
    let snapshotName: string | null = null;
    let snapshotEmail: string | null = null;
    try {
      const client = this.supabaseService.getAdminClient();
      const { data: supaUser } = await client.auth.admin.getUserById(targetUserId);
      if (supaUser?.user) {
        snapshotName = supaUser.user.user_metadata?.name ?? supaUser.user.email ?? null;
        snapshotEmail = supaUser.user.email ?? null;
      }
    } catch (err) {
      // não falhar o convite se não conseguirmos o snapshot
    }

    const created = await this.workspacesRepository.addMember({
      workspaceId: data.workspaceId,
      userId: targetUserId,
      role: data.role ?? 'MEMBER',
      name: snapshotName,
      email: snapshotEmail,
    });

    // Cria notificação para o usuário convidado
    try {
      const workspace = await this.prisma.workspace.findUnique({ where: { id: data.workspaceId } });
      const title = 'Você foi adicionado a um workspace';
      const message = workspace ? `Você foi adicionado ao workspace "${workspace.name}".` : 'Você foi adicionado a um workspace.';

      await this.prisma.notification.create({
        data: {
          workspaceId: data.workspaceId,
          userId: targetUserId,
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
