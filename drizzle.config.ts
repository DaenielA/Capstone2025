import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({
  path: '.env.local',
});

const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable is not set for Drizzle Kit');
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql', // Use 'dialect' to specify the database type
  dbCredentials: {
    url: postgresUrl, // 'url' is the expected property for the 'postgresql' dialect
  },
});
