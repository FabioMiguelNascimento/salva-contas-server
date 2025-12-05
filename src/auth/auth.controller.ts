import { Body, Controller, Get, Headers, Post, Put } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
    RefreshTokenInput,
    RefreshTokenSchema,
    ResetPasswordInput,
    ResetPasswordSchema,
    SignInInput,
    SignInSchema,
    SignUpInput,
    SignUpSchema,
    UpdatePasswordInput,
    UpdatePasswordSchema,
} from '../schemas/auth.schema';
import { success } from '../utils/api-response-helper';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SupabaseService } from './supabase.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly supabaseService: SupabaseService) {}

  @Public()
  @Post('signup')
  async signUp(
    @Body(new ZodValidationPipe(SignUpSchema)) data: SignUpInput,
  ) {
    const result = await this.supabaseService.signUp(data);
    return success(result, 'Conta criada com sucesso. Verifique seu email para confirmar.');
  }

  @Public()
  @Post('login')
  async signIn(
    @Body(new ZodValidationPipe(SignInSchema)) data: SignInInput,
  ) {
    const result = await this.supabaseService.signIn(data);
    return success(result, 'Login realizado com sucesso');
  }

  @Post('logout')
  async signOut(@Headers('authorization') authorization: string) {
    const token = authorization?.replace('Bearer ', '');
    const result = await this.supabaseService.signOut(token);
    return success(result, 'Logout realizado com sucesso');
  }

  @Public()
  @Post('refresh')
  async refreshToken(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) data: RefreshTokenInput,
  ) {
    const result = await this.supabaseService.refreshSession(data.refreshToken);
    return success(result, 'Token atualizado com sucesso');
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body(new ZodValidationPipe(ResetPasswordSchema)) data: ResetPasswordInput,
  ) {
    const result = await this.supabaseService.resetPassword(data.email);
    return success(result, 'Email de recuperação enviado');
  }

  @Put('update-password')
  async updatePassword(
    @Headers('authorization') authorization: string,
    @Body(new ZodValidationPipe(UpdatePasswordSchema)) data: UpdatePasswordInput,
  ) {
    const token = authorization?.replace('Bearer ', '');
    const result = await this.supabaseService.updatePassword(token, data.password);
    return success(result, 'Senha atualizada com sucesso');
  }

  @Get('me')
  async getMe(@CurrentUser() user: User) {
    return success(
      {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        createdAt: user.created_at,
        emailConfirmedAt: user.email_confirmed_at,
      },
      'Usuário recuperado com sucesso',
    );
  }
}
