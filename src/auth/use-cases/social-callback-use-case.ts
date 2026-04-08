import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';

export interface SocialCallbackResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class SocialCallbackUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(code: string): Promise<SocialCallbackResult> {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      throw error ?? new Error('Failed to exchange code for session');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }
}
