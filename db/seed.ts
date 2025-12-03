import { db } from './connection';
import { Roles, Users } from './schema';
import bcrypt from 'bcrypt';

/**
 * Seed the database with initial data
 */
async function seed() {
  try {
    console.log('Starting database seed...');

    // Check if we already have data
    const existingRoles = await db.select().from(Roles);
    if (existingRoles.length > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }

    // Seed roles
    console.log('Seeding roles...');
    const roles = await db.insert(Roles).values([
      { Name: 'Administrator', Description: 'System administrator with full access' },
      { Name: 'Manager', Description: 'Manager with access to admin functions' },
      { Name: 'Cashier', Description: 'Cashier with access to POS system' },
      { Name: 'Member', Description: 'Cooperative member' }
    ]).returning();
    console.log(`Seeded ${roles.length} roles`);

    // Get role IDs
    const adminRoleId = roles.find(r => r.Name === 'Administrator')?.RoleId;
    const cashierRoleId = roles.find(r => r.Name === 'Cashier')?.RoleId;

    if (!adminRoleId || !cashierRoleId) {
      throw new Error('Failed to retrieve role IDs');
    }

    // Seed users
    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const users = await db.insert(Users).values([
      {
        Name: 'Admin User',
        Email: 'admin@example.com',
        PasswordHash: passwordHash,
        RoleId: adminRoleId
      },
      {
        Name: 'Cashier User',
        Email: 'cashier@example.com',
        PasswordHash: passwordHash,
        RoleId: cashierRoleId
      }
    ]).returning();
    console.log(`Seeded ${users.length} users`);

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
