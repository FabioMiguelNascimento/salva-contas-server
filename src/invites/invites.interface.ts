import { FamilyInvite, User } from 'generated/prisma/client';

export type FamilyMemberDto = {
  id: string;
  name: string | null;
  email: string | null;
};

export type FamilyInviteTokenDto = {
  id: string;
  token: string;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  acceptedBy?: { id: string; name: string | null; email: string | null } | null;
};

export abstract class InvitesRepositoryInterface {
  abstract createInvite(data: {
    fromUserId: string;
    token: string;
    expiresAt: Date;
  }): Promise<FamilyInvite>;

  abstract findInviteByToken(token: string): Promise<
    | (FamilyInvite & {
        fromUser: Pick<User, 'id' | 'name' | 'email' | 'planTier'>;
      })
    | null
  >;

  abstract findInvitesByFromUserId(
    userId: string,
  ): Promise<FamilyInviteTokenDto[]>;

  abstract markInviteAccepted(data: {
    inviteId: string;
    acceptedById: string;
  }): Promise<void>;

  abstract setLinkedAccount(userId: string, linkedToId: string): Promise<void>;

  abstract findUserById(
    id: string,
  ): Promise<Pick<User, 'id' | 'name' | 'email' | 'linkedToId'> | null>;

  abstract findLinkedUsers(ownerId: string): Promise<FamilyMemberDto[]>;

  abstract unlinkFamilyMember(memberId: string): Promise<void>;
}
