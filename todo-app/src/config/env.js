// ── Config: the "fail fast" pattern ─────────────────────────────────────────
// LESSON: A surprisingly common source of 3am production bugs is a server
// that *starts successfully* with a missing/malformed environment variable,
// then blows up later on the first request that needs it. The fix is to
// validate all config ONCE, at startup, and crash immediately with a clear
// error if something's wrong — instead of limping along and failing weirdly
// mid-request. This module is the single place that reads `process.env`;
// every other file imports the validated `config` object from here, never
// `process.env` directly. That also makes it trivial to swap in a fake
// config for tests.
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  DB_PATH: z.string().min(1).default('./data/todo.sqlite'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  AGENT_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadConfig(source = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // .flatten() turns Zod's error tree into { fieldErrors: { PORT: [...] } }
    // which is far more readable in a terminal than the raw error object.
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
    throw new Error('Refusing to start with invalid configuration — see errors above.');
  }
  return result.data;
}

export const config = loadConfig();

// Exported separately so tests can build a config from a fake env object
// without touching the real process.env.
export { loadConfig };
