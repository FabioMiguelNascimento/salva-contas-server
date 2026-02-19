import { BadRequestException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { SignInInput, SignUpInput } from '../schemas/auth.schema';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private adminClient?: SupabaseClient;

  onModuleInit() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    );

    // admin client (service role) — usado para operações que exigem privilégios administrativos
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.adminClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      throw new Error('Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY');
    }
    return this.adminClient;
  }

  async validateToken(token: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  }

  async signUp(input: SignUpInput) {
    const { data, error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
        },
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async signIn(input: SignInInput) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    return {
      user: data.user,
      session: data.session,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at,
    };
  }

  async signOut(token: string) {
    // Precisamos setar o token antes de fazer logout
    const { error } = await this.supabase.auth.admin.signOut(token);
    
    if (error) {
      // Tenta logout normal se admin falhar
      await this.supabase.auth.signOut();
    }

    return { message: 'Logout realizado com sucesso' };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    return {
      user: data.user,
      session: data.session,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
      expiresAt: data.session?.expires_at,
    };
  }

  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Email de recuperação enviado com sucesso' };
  }

  async updatePassword(token: string, newPassword: string) {
    // Primeiro validamos o token
    const user = await this.validateToken(token);
    
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }

    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Senha atualizada com sucesso' };
  }

  async updateProfile(token: string, payload: { name?: string; preferences?: any }) {
    // valida o token primeiro
    const user = await this.validateToken(token);
    if (!user) {
      throw new UnauthorizedException('Token inválido');
    }

    // supabase client permite atualizar user metadata via updateUser({ data })
    const { data, error } = await this.supabase.auth.updateUser({
      data: {
        name: payload.name ?? user.user_metadata?.name,
        preferences: payload.preferences ?? user.user_metadata?.preferences ?? undefined,
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data.user;
  }
  async getUser(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return data.user;
  }
}
