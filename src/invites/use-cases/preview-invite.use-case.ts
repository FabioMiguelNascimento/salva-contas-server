import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InvitesRepositoryInterface } from '../invites.interface';

@Injectable()
export class PreviewInviteUseCase {
  constructor(
    @Inject(InvitesRepositoryInterface)
    private readonly invitesRepository: InvitesRepositoryInterface,
  ) {}

  async execute(token: string) {
    const invite = await this.invitesRepository.findInviteByToken(token);

    if (!invite || invite.status !== 'pending') {
      throw new NotFoundException('Convite não encontrado ou já utilizado.');
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Este convite expirou.');
    }

    return {
      ownerName: invite.fromUser?.name || invite.fromUser?.email || 'Conta principal',
      expiresAt: invite.expiresAt,
    };
  }
}
