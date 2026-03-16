import { FamilyInvite, User } from 'generated/prisma/client';

export type FamilyMemberDto = {
  id: string;
  name: string | null;
  email: string | null;
};

export abstract class InvitesRepositoryInterface {
  abstract createInvite(data: {
    fromUserId: string;
    token: string;
    expiresAt: Date;
  }): Promise<FamilyInvite>;

  abstract findInviteByToken(token: string): Promise<(FamilyInvite & { fromUser: Pick<User, 'id' | 'name' | 'email'> }) | null>;

  abstract markInviteAccepted(data: {
    inviteId: string;
    acceptedById: string;
  }): Promise<void>;

  abstract setLinkedAccount(userId: string, linkedToId: string): Promise<void>;

  abstract findUserById(id: string): Promise<Pick<User, 'id' | 'name' | 'email' | 'linkedToId'> | null>;

  abstract findLinkedUsers(ownerId: string): Promise<FamilyMemberDto[]>;
}
