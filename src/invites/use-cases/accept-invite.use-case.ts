import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { AcceptInviteInput } from 'src/schemas/invites.schema';
import { InvitesRepositoryInterface } from '../invites.interface';

@Injectable()
export class AcceptInviteUseCase {
  constructor(
    private readonly userContext: UserContext,
    @Inject(InvitesRepositoryInterface)
    private readonly invitesRepository: InvitesRepositoryInterface,
  ) {}

  async execute(input: AcceptInviteInput) {
    const invite = await this.invitesRepository.findInviteByToken(input.token);

    if (!invite || invite.status !== 'pending') {
      throw new NotFoundException('Convite não encontrado ou já utilizado.');
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Este convite expirou. Gere um novo link.');
    }

    const actorUserId = this.userContext.actorUserId;

    if (invite.fromUserId === actorUserId) {
      throw new BadRequestException('Você não pode aceitar um convite da sua própria conta.');
    }

    await this.invitesRepository.setLinkedAccount(actorUserId, invite.fromUserId);
    await this.invitesRepository.markInviteAccepted({
      inviteId: invite.id,
      acceptedById: actorUserId,
    });

    return {
      linkedToId: invite.fromUserId,
      ownerName: invite.fromUser?.name || invite.fromUser?.email || 'Conta principal',
    };
  }
}
