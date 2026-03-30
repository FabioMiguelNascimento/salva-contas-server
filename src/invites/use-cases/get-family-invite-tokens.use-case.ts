import { Inject, Injectable } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import {
  FamilyInviteTokenDto,
  InvitesRepositoryInterface,
} from '../invites.interface';

export type FamilyInviteTokensResponse = {
  activeInvites: FamilyInviteTokenDto[];
  acceptedInvites: FamilyInviteTokenDto[];
};

@Injectable()
export class GetFamilyInviteTokensUseCase {
  constructor(
    private readonly userContext: UserContext,
    @Inject(InvitesRepositoryInterface)
    private readonly invitesRepository: InvitesRepositoryInterface,
  ) {}

  async execute(): Promise<FamilyInviteTokensResponse> {
    const userId = this.userContext.actorUserId;
    const invites =
      await this.invitesRepository.findInvitesByFromUserId(userId);

    const now = new Date();

    const activeInvites = invites
      .filter((invite) => invite.status === 'pending' && invite.expiresAt > now)
      .map((invite) => ({ ...invite }));

    const acceptedInvites = invites
      .filter((invite) => invite.status === 'accepted')
      .map((invite) => ({ ...invite }));

    return {
      activeInvites,
      acceptedInvites,
    };
  }
}
