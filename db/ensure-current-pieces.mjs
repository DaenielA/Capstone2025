import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });
try {
  console.log('Applying ALTER TABLE to add current_pieces_per_pack if missing...');
  await sql`ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "current_pieces_per_pack" numeric(10, 2);`;
  console.log('ALTER TABLE completed successfully.');
} catch (err) {
  console.error('Error applying ALTER TABLE:', err);
  process.exit(1);
} finally {
  await sql.end();
}

console.log('Done.');
