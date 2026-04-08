import { Body, Controller, Get, Headers, InternalServerErrorException, Param, Post, Put, Query, Redirect, Req, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from 'src/idempotency/idempotency.interceptor';
import { User } from '@supabase/supabase-js';
import { Request as ExpressRequest } from 'express';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  OAuthCallbackInput,
  OAuthCallbackSchema,
  OAuthProviderInput,
  OAuthProviderSchema,
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
  UpdateProfileSchema,
} from '../schemas/auth.schema';
import { success } from '../utils/api-response-helper';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { SocialCallbackUseCase } from './use-cases/social-callback-use-case';
import { SocialLoginUseCase } from './use-cases/social-login-use-case';
import { SupabaseService } from './supabase.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly socialLoginUseCase: SocialLoginUseCase,
    private readonly socialCallbackUseCase: SocialCallbackUseCase,
    private readonly supabaseService: SupabaseService,
  ) { }

  @Public()
  @Post('signup')
  @UseInterceptors(IdempotencyInterceptor)
  async signUp(@Body(new ZodValidationPipe(SignUpSchema)) data: SignUpInput) {
    const result = await this.supabaseService.signUp(data);
    return success(
      result,
      'Conta criada com sucesso. Verifique seu email para confirmar.',
    );
  }

  @Public()
  @Post('login')
  @UseInterceptors(IdempotencyInterceptor)
  async signIn(@Body(new ZodValidationPipe(SignInSchema)) data: SignInInput) {
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
  @UseInterceptors(IdempotencyInterceptor)
  async updatePassword(
    @Headers('authorization') authorization: string,
    @Body(new ZodValidationPipe(UpdatePasswordSchema))
    data: UpdatePasswordInput,
  ) {
    const token = authorization?.replace('Bearer ', '');
    const result = await this.supabaseService.updatePassword(
      token,
      data.password,
    );
    return success(result, 'Senha atualizada com sucesso');
  }

  @Put('update-profile')
  @UseInterceptors(IdempotencyInterceptor)
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) data: any,
  ) {
    const token = authorization?.replace('Bearer ', '');
    const updated = await this.supabaseService.updateProfile(token, data);
    return success(
      {
        id: updated?.id,
        email: updated?.email,
        name:
          updated?.user_metadata?.name ??
          updated?.user_metadata?.preferences?.name,
        user_metadata: updated?.user_metadata,
      },
      'Perfil atualizado com sucesso',
    );
  }

 @Public()
  @Get('providers/:provider')
  @Redirect()
  async socialLoginUrl(
    @Req() req: ExpressRequest,
    @Param('provider', new ZodValidationPipe(OAuthProviderSchema)) provider: OAuthProviderInput,
    @Query('next') next?: string,
  ) {
    const frontendUrl = process.env.SUPABASE_REDIRECT_URL || 'http://localhost:3000';
    const redirectPath = next || 'entrar';
    
    const callbackUrl = `${frontendUrl}/${redirectPath}`;

    const client = this.supabaseService.getClient();
    
    const { data, error } = await client.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      throw new InternalServerErrorException(`Falha ao iniciar login com ${provider}`);
    }

    return { url: data.url };
  }

  @Public()
  @Get('callback/:provider')
  @Redirect()
  async socialCallback(
    @Req() req: ExpressRequest,
    @Param('provider', new ZodValidationPipe(OAuthProviderSchema)) provider: OAuthProviderInput,
    @Query(new ZodValidationPipe(OAuthCallbackSchema)) query: OAuthCallbackInput,
  ) {
    const frontendUrl = process.env.SUPABASE_REDIRECT_URL
    const redirectPath = query.next || 'entrar';

    if (query.error) {
      console.error('Erro no OAuth:', query.error, query.error_description);
      return { url: `${frontendUrl}/${redirectPath}?error=${query.error}` };
    }

    if (!query.code) {
      return { url: `${frontendUrl}/${redirectPath}?error=missing_code` };
    }

    try {
      const { accessToken, refreshToken, expiresIn } =
        await this.socialCallbackUseCase.execute(query.code);

      const fragment = `access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=${expiresIn}&type=signup`;
      return { url: `${frontendUrl}/${redirectPath}#${fragment}` };
    } catch (error) {
      console.error('Erro ao processar callback do OAuth:', error);
      return { url: `${frontendUrl}/${redirectPath}?error=session_exchange_failed` };
    }
  }

  @Get('me')
  async getMe(@CurrentUser() user: User, @Req() req: ExpressRequest) {
    const localUser = req['localUser'];

    return success(
      {
        id: localUser?.id ?? user.id,
        email: localUser?.email ?? user.email,
        name: localUser?.name ?? user.user_metadata?.name,
        planTier: localUser?.planTier ?? null,
        mpCustomerId: localUser?.mpCustomerId ?? null,
        linkedToId: localUser?.linkedToId ?? null,
        createdAt: localUser?.createdAt ?? user.created_at,
        emailConfirmedAt: user.email_confirmed_at,
      },
      'Usuário recuperado com sucesso',
    );
  }
}