import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InvitesController } from './invites.controller';
import { InvitesRepositoryInterface } from './invites.interface';
import { InvitesRepository } from './invites.repository';
import { AcceptInviteUseCase } from './use-cases/accept-invite.use-case';
import { GenerateInviteUseCase } from './use-cases/generate-invite.use-case';
import { GetFamilyMembersUseCase } from './use-cases/get-family-members.use-case';
import { PreviewInviteUseCase } from './use-cases/preview-invite.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [InvitesController],
  providers: [
    {
      provide: InvitesRepositoryInterface,
      useClass: InvitesRepository,
    },
    GenerateInviteUseCase,
    AcceptInviteUseCase,
    PreviewInviteUseCase,
    GetFamilyMembersUseCase,
  ],
  exports: [GetFamilyMembersUseCase],
})
export class InvitesModule {}
