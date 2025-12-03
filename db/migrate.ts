import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set for migration');
}

const runMigrate = async () => {
  try {
    console.log("Connecting to database...");
    const migrationClient = postgres(databaseUrl, { max: 1 }); // Use postgres client for migrations
    const db = drizzle(migrationClient);

    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    console.log("Migrations applied successfully!");

    await migrationClient.end(); // Ensure the client connection is closed
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigrate(); 