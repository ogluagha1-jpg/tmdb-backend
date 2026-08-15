import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  TMDB_API_KEY: z.string().min(1, 'TMDB_API_KEY is required'),
  OMDB_API_KEY: z.string().optional(),
  MIN_MOVIES_PER_CATEGORY: z.coerce.number().default(6),
  CATEGORIES_CRON_SCHEDULE: z.string().default('0 */6 * * *'),
  MOVIES_SYNC_CRON_SCHEDULE: z.string().default('0 */2 * * *'),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://tldojispxcgjzezxwabp.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZG9qaXNweGNnanplenh3YWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3ODYwNzksImV4cCI6MjA4NzM2MjA3OX0.C5R3idvWtdneOaZ29j5aSIhrP588O8W9BMUnHUIGZpQ',
  TMDB_API_KEY: process.env.TMDB_API_KEY || 'e27d0d97991b06582fc48c3f26c06dce',
  OMDB_API_KEY: process.env.OMDB_API_KEY,
  MIN_MOVIES_PER_CATEGORY: process.env.MIN_MOVIES_PER_CATEGORY || 6,
  CATEGORIES_CRON_SCHEDULE: process.env.CATEGORIES_CRON_SCHEDULE || '0 */6 * * *',
  MOVIES_SYNC_CRON_SCHEDULE: process.env.MOVIES_SYNC_CRON_SCHEDULE || '0 */2 * * *',
});
