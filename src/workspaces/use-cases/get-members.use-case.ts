import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../auth/supabase.service';
import { UserContext } from '../../auth/user-context.service';
import { WorkspacesRepositoryInterface } from '../workspaces.interface';

@Injectable()
export class GetWorkspaceMembersUseCase {
  constructor(
    @Inject(WorkspacesRepositoryInterface)
    private readonly workspacesRepository: WorkspacesRepositoryInterface,
    private readonly supabaseService: SupabaseService,
    private readonly userContext: UserContext,
  ) {}

  async execute(workspaceId: string) {
    const memberships = await this.workspacesRepository.getMembers(workspaceId);

    if (!memberships) {
      throw new NotFoundException('Workspace não encontrado');
    }

    let client: any = null;
    try {
      client = this.supabaseService.getAdminClient();
    } catch (err) {
      console.warn('Supabase admin client not configured; skipping remote user lookups');
    }

    const usersById = new Map<string, any>();

    // prepara lista de userIds que precisam de lookup no Supabase
    const needsLookup = new Set<string>();
    memberships.forEach((m: any) => {
      if (m.name || m.email) {
        usersById.set(m.userId, { user_metadata: { name: m.name }, email: m.email });
      } else {
        needsLookup.add(m.userId);
      }
    });

    // se temos admin client, consulta apenas os userIds que não têm snapshot
    if (client && needsLookup.size > 0) {
      await Promise.all(
        Array.from(needsLookup).map(async (uid) => {
          try {
            const { data, error } = await client.auth.admin.getUserById(uid);
            if (!error && data?.user) usersById.set(uid, data.user);
          } catch (err) {
            // ignore erros individuais
          }
        }),
      );
    }

    return memberships.map((m: any) => {
      let u = usersById.get(m.userId);

      // se não encontramos o usuário remotamente, mas o userId é o mesmo do requestor,
      // use os dados do UserContext (token atual) para preencher o nome/email
      if (!u && this.userContext?.user && this.userContext.user.id === m.userId) {
        const cu = this.userContext.user as any;
        u = { user_metadata: { name: cu.user_metadata?.name ?? cu.name }, email: cu.email };
      }

      const nameFromDb = m.name ?? m.email ?? null;
      const nameFromSupabase = u?.user_metadata?.name ?? u?.email ?? null;

      return {
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        lastAccessed: m.lastAccessed,
        name: nameFromDb ?? nameFromSupabase ?? 'Usuário não encontrado',
        email: m.email ?? u?.email ?? null,
        missingUser: !u && !m.name && !m.email,
      };
    });
  }
}