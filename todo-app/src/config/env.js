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
    console.error('Invalid environment configuration:');
    console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
    throw new Error('Refusing to start with invalid configuration — see errors above.');
  }
  return result.data;
}

export const config = loadConfig();
export { loadConfig };
