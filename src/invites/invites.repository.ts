import { Injectable, Scope } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
    FamilyMemberDto,
    InvitesRepositoryInterface,
} from './invites.interface';

@Injectable({ scope: Scope.REQUEST })
export class InvitesRepository implements InvitesRepositoryInterface {
  constructor(private readonly prisma: PrismaService) {}

  async createInvite(data: {
    fromUserId: string;
    token: string;
    expiresAt: Date;
  }) {
    return this.prisma.familyInvite.create({
      data: {
        fromUserId: data.fromUserId,
        token: data.token,
        status: 'pending',
        expiresAt: data.expiresAt,
      },
    });
  }

  async findInviteByToken(token: string) {
    return this.prisma.familyInvite.findUnique({
      where: { token },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async markInviteAccepted(data: { inviteId: string; acceptedById: string }) {
    await this.prisma.familyInvite.update({
      where: { id: data.inviteId },
      data: {
        status: 'accepted',
        acceptedById: data.acceptedById,
        acceptedAt: new Date(),
      },
    });
  }

  async setLinkedAccount(userId: string, linkedToId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { linkedToId },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        linkedToId: true,
      },
    });
  }

  async findInvitesByFromUserId(userId: string) {
    const invites = await this.prisma.familyInvite.findMany({
      where: { fromUserId: userId },
      include: {
        acceptedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invites.map((invite) => ({
      id: invite.id,
      token: invite.token,
      status: invite.status,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      acceptedBy: invite.acceptedBy
        ? {
            id: invite.acceptedBy.id,
            name: invite.acceptedBy.name,
            email: invite.acceptedBy.email,
          }
        : null,
    }));
  }

  async findLinkedUsers(ownerId: string): Promise<FamilyMemberDto[]> {
    const users = await this.prisma.user.findMany({
      where: { linkedToId: ownerId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    }));
  }

  async unlinkFamilyMember(memberId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: memberId },
      data: { linkedToId: null },
    });
  }
}
