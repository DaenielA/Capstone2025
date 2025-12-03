import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  console.log('\nChecking for current_pieces_per_pack column (case-insensitive check)...\n');
  const result = await sql`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE lower(table_name) = 'products' AND lower(column_name) = 'current_pieces_per_pack'
  `;

  if (result.length > 0) {
    console.log('✅ Column exists. Details:');
    console.table(result.map(r => ({ schema: r.table_schema, table: r.table_name, column: r.column_name, type: r.data_type })));
  } else {
    console.log('⚠️ Column not found. Listing all columns for table(s) named Products/products...\n');
    const allCols = await sql`
      SELECT table_schema, table_name, column_name, data_type
      FROM information_schema.columns
      WHERE lower(table_name) = 'products'
      ORDER BY table_schema, table_name, ordinal_position
    `;

    if (allCols.length > 0) {
      console.table(allCols.map(r => ({ schema: r.table_schema, table: r.table_name, column: r.column_name, type: r.data_type })));
    } else {
      console.log('No table named Products (any case) was found in information_schema.');
    }
  }
} catch (err) {
  console.error('Error while checking schema:', err);
  process.exit(1);
} finally {
  await sql.end();
}

console.log('\nDone.');
