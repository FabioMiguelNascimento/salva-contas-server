import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { SupabaseService } from './supabase.service';
import { UserContext } from './user-context.service';
import { SocialLoginUseCase } from './use-cases/social-login-use-case';
import { SocialCallbackUseCase } from './use-cases/social-callback-use-case';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    SupabaseService,
    UserContext,
    SocialLoginUseCase,
    SocialCallbackUseCase,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
  exports: [SupabaseService, UserContext],
})
export class AuthModule {}
