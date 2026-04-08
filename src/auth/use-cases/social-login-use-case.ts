import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase.service';
import { Provider } from '@supabase/supabase-js';

@Injectable()
export class SocialLoginUseCase {
  constructor(private readonly supabase: SupabaseService) {}

  async execute(provider: Provider, callbackUrl: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error || !data.url) {
      throw error ?? new Error('OAuth provider unavailable');
    }

    return { url: data.url };
  }
}
