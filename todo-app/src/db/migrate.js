// Run with `npm run migrate`. Creates data/todo.sqlite (if missing) and
// applies schema.sql. Safe to run repeatedly — every statement in schema.sql
// uses "CREATE TABLE IF NOT EXISTS" / "CREATE INDEX IF NOT EXISTS".
//
// LESSON: a real production app would use a *versioned* migration tool
// (node-pg-migrate, Knex migrations, Prisma Migrate, ...) where each schema
// change is its own numbered file, so you can upgrade a live database
// incrementally without dropping data. We're using one flat schema.sql here
// because it's simpler to read as a learning project — the migration
// concept transfers directly once you're ready for the real thing.
import { config } from '../config/env.js';
import { createConnection, runMigrations } from './connection.js';

const db = createConnection(config.DB_PATH);
runMigrations(db);
console.log(`Migrated database at ${config.DB_PATH}`);
db.close();
