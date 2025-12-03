import { db } from '@/db/connection';
import { MemberActivities, Members } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Repository for Member Activity data access
 */
export class MemberActivityRepository {
  /**
   * Get recent member activities
   * @param limit Number of activities to return
   */
  static async GetRecent(limit: number) {
    try {
      return await db
        .select()
        .from(MemberActivities)
        .leftJoin(Members, eq(MemberActivities.MemberId, Members.MemberId))
        .orderBy(desc(MemberActivities.Timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Error getting recent member activities:', error);
      throw error;
    }
  }
}