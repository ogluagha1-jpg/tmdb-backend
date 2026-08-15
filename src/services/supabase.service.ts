import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export class SupabaseService {
  private static instance: SupabaseClient;

  public static getClient(): SupabaseClient {
    if (!this.instance) {
      this.instance = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return this.instance;
  }
}
