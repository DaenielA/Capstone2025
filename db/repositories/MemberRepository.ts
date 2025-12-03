import { db } from '../connection';
import { Members, Users, Roles, Transactions, TransactionItems, Products, Credits } from '../schema';
import { eq, sql, getTableColumns, desc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../schema';

/**
 * Represents the flattened result of a joined query on Members, Users, and Roles.
 */
export type JoinedMemberResult = typeof Members.$inferSelect & {
  UserName: string | null;
  UserEmail: string | null;
  RoleName: string | null;
};

type DbOrTx = PostgresJsDatabase<typeof schema>;

/**
 * Repository for Member data access
 */
export class MemberRepository {
  /**
   * Get all members with their associated user and role info
   */
  static async GetAll() {
    try {
      // Use a relational query to avoid the column alias issue with deep joins.
      // This fetches all members and their primary user/role info.
      // For deep relations like transactions, it's better to query them on-demand
      // in a separate method like GetById to keep the initial list load fast.
      return await db.query.Members.findMany({
        with: {
          User: {
            with: {
              Role: {
                columns: { Name: true }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching all members:', error);
      throw error;
    }
  }

  /**
   * Get a member by ID with full details including user and role info
   */
  static async GetById(memberId: number) {
    try {
      const result = await db.query.Members.findFirst({
        where: eq(Members.MemberId, memberId),
        with: {
          User: {
            with: {
              Role: {
                columns: { Name: true }
              }
            }
          }
        }
      });

      if (!result) {
        throw new Error(`Member with ID ${memberId} not found`);
      }

      return result;
    } catch (error) {
      console.error(`Error fetching member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get a member by email with full details including user and role info
   */
  static async GetByEmail(email: string) {
    try {
      const result = await db.query.Members.findFirst({
        where: eq(Members.Email, email),
        with: {
          User: {
            with: {
              Role: {
                columns: { Name: true }
              }
            }
          }
        }
      });

      if (!result) {
        // It's better to return null or an empty result if not found,
        // rather than throwing an error, to allow for "not found" checks.
        return null;
      }

      return result;
    } catch (error) {
      console.error(`Error fetching member with email ${email}:`, error);
      throw error;
    }
  }

  /**
   * Create a new member
   */
  static async Create(memberData: typeof Members.$inferInsert) {
    try {
      const result = await db.insert(Members).values(memberData).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating member:', error);
      throw error;
    }
  }

  /**
   * Update a member
   */
  static async Update(memberId: number, updateData: Partial<typeof Members.$inferInsert>) {
    try {
      const result = await db.update(Members)
        .set(updateData)
        .where(eq(Members.MemberId, memberId))
        .returning();

      if (result.length === 0) {
        throw new Error(`Member with ID ${memberId} not found`);
      }

      return result[0];
    } catch (error) {
      console.error(`Error updating member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a member
   */
  static async Delete(memberId: number) {
    try {
      const result = await db.delete(Members)
        .where(eq(Members.MemberId, memberId))
        .returning();

      if (result.length === 0) {
        throw new Error(`Member with ID ${memberId} not found`);
      }

      return result[0];
    } catch (error) {
      console.error(`Error deleting member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Synchronize member credit balance with running balance from Credits records
   * Optimized version using SQL aggregation for better performance
   * @param memberId - The ID of the member
   * @param tx - Optional transaction object
   */
  static async synchronizeCreditBalance(memberId: number, tx?: DbOrTx) {
    const dbConnection = tx || db;
    try {
      // Use SQL aggregation for better performance - calculate balance in a single query
      const balanceResult = await dbConnection
        .select({
          balance: sql<number>`
            COALESCE(
              SUM(
                CASE
                  WHEN ${Credits.Type} IN ('Spent', 'Adjustment') THEN CAST(${Credits.Amount} AS DECIMAL(10,2))
                  WHEN ${Credits.Type} IN ('Payment', 'Earned') THEN -CAST(${Credits.Amount} AS DECIMAL(10,2))
                  ELSE 0
                END
              ), 0
            )
          `
        })
        .from(Credits)
        .where(eq(Credits.MemberId, memberId));

      const runningBalance = Number(balanceResult[0]?.balance || 0);
      const newBalance = runningBalance.toFixed(2);

      // Update the stored CreditBalance
      await dbConnection.update(Members)
        .set({ CreditBalance: newBalance })
        .where(eq(Members.MemberId, memberId));

      return parseFloat(newBalance);
    } catch (error) {
      console.error(`Error synchronizing credit balance for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Optimized version: Only synchronize if balance is significantly different
   * This prevents unnecessary updates when the difference is due to floating point precision
   * @param memberId - The ID of the member
   * @param tx - Optional transaction object
   * @param tolerance - Maximum allowed difference before synchronization (default: 0.01)
   */
  static async synchronizeCreditBalanceOptimized(memberId: number, tx?: DbOrTx, tolerance: number = 0.01) {
    const dbConnection = tx || db;
    try {
      // Get current stored balance
      const member = await dbConnection.select({ CreditBalance: Members.CreditBalance })
        .from(Members)
        .where(eq(Members.MemberId, memberId))
        .limit(1);

      if (!member.length) {
        throw new Error(`Member ${memberId} not found`);
      }

      const currentStoredBalance = parseFloat(member[0].CreditBalance);

      // Calculate actual running balance using optimized SQL
      const balanceResult = await dbConnection
        .select({
          balance: sql<number>`
            COALESCE(
              SUM(
                CASE
                  WHEN ${Credits.Type} IN ('Spent', 'Adjustment') THEN CAST(${Credits.Amount} AS DECIMAL(10,2))
                  WHEN ${Credits.Type} IN ('Payment', 'Earned') THEN -CAST(${Credits.Amount} AS DECIMAL(10,2))
                  ELSE 0
                END
              ), 0
            )
          `
        })
        .from(Credits)
        .where(eq(Credits.MemberId, memberId));

      const actualBalance = Number(balanceResult[0]?.balance || 0);

      // Only update if the difference exceeds tolerance
      if (Math.abs(currentStoredBalance - actualBalance) > tolerance) {
        const newBalance = actualBalance.toFixed(2);
        await dbConnection.update(Members)
          .set({ CreditBalance: newBalance })
          .where(eq(Members.MemberId, memberId));

        return parseFloat(newBalance);
      }

      // Return current balance if no update needed
      return currentStoredBalance;
    } catch (error) {
      console.error(`Error synchronizing credit balance for member ${memberId}:`, error);
      throw error;
    }
  }
}
