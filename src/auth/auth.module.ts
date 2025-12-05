import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { SupabaseService } from './supabase.service';
import { UserContext } from './user-context.service';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    SupabaseService,
    UserContext,
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
  exports: [SupabaseService, UserContext],
})
export class AuthModule {}
