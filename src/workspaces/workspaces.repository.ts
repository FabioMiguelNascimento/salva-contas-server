import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from '../auth/user-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesRepositoryInterface } from './workspaces.interface';

@Injectable({ scope: Scope.REQUEST })
export class WorkspacesRepository implements WorkspacesRepositoryInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userContext: UserContext,
  ) {}

  private get userId(): string {
    return this.userContext.userId;
  }

  async getWorkspacesByUserId(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true,
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      lastAccessed: m.lastAccessed ?? null,
    }));
  }

  async createWorkspace(data: { name: string; description?: string }) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name: data.name,
      },
    });

    // Adiciona o criador como ADMIN
    await this.prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: this.userId,
        role: 'ADMIN',
      },
    });

    return workspace;
  }

  async addMember(data: {
    workspaceId: string;
    userId: string;
    role: 'ADMIN' | 'MEMBER';
  }) {
    return this.prisma.workspaceMember.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        role: data.role,
      },
    });
  }

  async touchMembership(workspaceId: string, userId: string) {
    await this.prisma.workspaceMember.updateMany({
      where: { workspaceId, userId },
      data: { lastAccessed: new Date() },
    });
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await this.prisma.workspaceMember.deleteMany({
      where: {
        workspaceId,
        userId,
      },
    });
  }

  async getMembership(workspaceId: string, userId: string) {
    return this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
      },
    });
  }
}
