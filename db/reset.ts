import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set for DB reset');
}

const client = postgres(databaseUrl, { max: 1 });

async function resetDatabase() {
  try {
    console.log('Starting database reset (dropping and recreating public schema)...');

    // Drop the entire public schema, which contains all tables, types, etc.
    // The CASCADE option removes all objects within the schema.
    await client.unsafe(`DROP SCHEMA public CASCADE;`);
    console.log('Schema "public" dropped.');

    // Recreate the public schema so migrations can run.
    await client.unsafe(`CREATE SCHEMA public;`);
    console.log('Schema "public" created.');

    // We don't need to drop drizzle's history table separately as it's in its own schema.
    // However, to be absolutely safe and force a full migration run:
    console.log('Dropping Drizzle migration history...');
    await client.unsafe(`DROP TABLE IF EXISTS drizzle.__drizzle_migrations;`);

    console.log('Database reset successfully.');
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();