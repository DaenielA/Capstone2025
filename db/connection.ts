import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set for DB client');
}

/**
 * Postgres client for queries
 */
const queryClient = postgres(databaseUrl, {
  // Vercel Postgres and other serverless providers need this to route to the correct database.
  // See: https://orm.drizzle.team/docs/get-started-postgresql#vercel-postgres
  // and https://github.com/drizzle-team/drizzle-orm/issues/1132
  // The value should be the project name from your Vercel dashboard.
  // Example: `options=project%3Dmy-cool-project` in the connection string.
  // `postgres-js` will automatically parse this.
});

/**
 * Main database instance with Drizzle ORM
 */
export const db = drizzle(queryClient, { schema });

/**
 * Test the database connection
 * @returns Promise that resolves to true if connection succeeds, or the error if it fails
 */
export async function TestDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set for DB client');
    }

    const testClient = postgres(databaseUrl, { max: 1 });
    
    // Use the correct method for postgres client
    await testClient`SELECT 1 as connection_test`;
    await testClient.end();
    
    return { 
      success: true, 
      message: 'Database connection successful' 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Database connection failed: ${error.message || 'Unknown error'}` 
    };
  }
}

// Export the schema for easy access
export * from './schema'; 