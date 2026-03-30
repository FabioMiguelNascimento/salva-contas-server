import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PLAN_LIMITS } from 'src/config/plan-limits.config';
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
      throw new BadRequestException(
        'Você não pode aceitar um convite da sua própria conta.',
      );
    }

    // Limiteur maxUsers do plano FAMILY
    const planLimits = PLAN_LIMITS[invite.fromUser.planTier];
    const members = await this.invitesRepository.findLinkedUsers(
      invite.fromUserId,
    );
    const total = members.length + 1; // inclui o proprietário
    if (total >= planLimits.maxUsers) {
      throw new BadRequestException(
        'O proprietário já atingiu o limite de membros do plano FAMILY.',
      );
    }

    await this.invitesRepository.setLinkedAccount(
      actorUserId,
      invite.fromUserId,
    );
    await this.invitesRepository.markInviteAccepted({
      inviteId: invite.id,
      acceptedById: actorUserId,
    });

    return {
      linkedToId: invite.fromUserId,
      ownerName:
        invite.fromUser?.name || invite.fromUser?.email || 'Conta principal',
    };
  }
}
