import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set for DB client');
}

// Use this client for application queries
const queryClient = postgres(databaseUrl);
export const db = drizzle(queryClient, { schema });

// Export the schema for easy access
export * from './schema';

// Re-export everything from the connection file
export * from './connection'; 