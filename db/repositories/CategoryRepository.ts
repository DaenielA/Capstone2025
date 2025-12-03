import { db } from '../connection';
import { Categories } from '../schema';
import { eq } from 'drizzle-orm';

/**
 * Repository for Category data access
 */
export class CategoryRepository {
  /**
   * Get all categories
   */
  
  static async GetAllCategory() {
    try {
      return await db.select()
        .from(Categories);
    } catch (error) {
      console.error(`Error getting category :`, error);
      throw error;
    }
  }

} 