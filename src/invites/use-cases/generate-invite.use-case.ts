import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserContext } from 'src/auth/user-context.service';
import { InvitesRepositoryInterface } from '../invites.interface';

@Injectable()
export class GenerateInviteUseCase {
  private readonly inviteTtlDays = Number(process.env.FAMILY_INVITE_TTL_DAYS || 7);

  constructor(
    private readonly userContext: UserContext,
    @Inject(InvitesRepositoryInterface)
    private readonly invitesRepository: InvitesRepositoryInterface,
  ) {}

  async execute() {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.inviteTtlDays);

    await this.invitesRepository.createInvite({
      fromUserId: this.userContext.actorUserId,
      token,
      expiresAt,
    });

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
      token,
      inviteUrl: `${frontendBaseUrl}/invite/${token}`,
      expiresAt,
    };
  }
}
