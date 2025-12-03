import { db } from '@/db/connection';
import { Events } from '@/db/schema';
import { gte, asc } from 'drizzle-orm';

/**
 * Repository for Event data access
 */
export class EventRepository {
  /**
   * Get upcoming events
   * @param limit Number of events to return
   */
  static async GetUpcoming(limit: number) {
    try {
      return await db
        .select()
        .from(Events)
        .where(gte(Events.EventDate, new Date()))
        .orderBy(asc(Events.EventDate))
        .limit(limit);
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  }
}