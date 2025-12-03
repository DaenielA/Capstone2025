import { db } from '../connection';
import { AuditLogs } from '../schema';
import { eq, desc, and } from 'drizzle-orm';


/**
 * Repository for Audit logging
 */
export class AuditRepository {
  /**
   * Log an action performed by a user
   */
  static async logAction(params: {
    userId: number;
    action: string;
    entityType: string;
    entityId?: number;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await db.insert(AuditLogs).values({
        UserId: params.userId,
        Action: params.action,
        EntityType: params.entityType,
        EntityId: params.entityId,
        Details: params.details,
        IpAddress: params.ipAddress,
        UserAgent: params.userAgent,
        Timestamp: new Date(),
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(filters?: {
    userId?: number;
    action?: string;
    entityType?: string;
    entityId?: number;
    limit?: number;
    offset?: number;
  }) {
    try {
      const conditions = [];
      if (filters?.userId) {
        conditions.push(eq(AuditLogs.UserId, filters.userId));
      }
      if (filters?.action) {
        conditions.push(eq(AuditLogs.Action, filters.action));
      }
      if (filters?.entityType) {
        conditions.push(eq(AuditLogs.EntityType, filters.entityType));
      }
      if (filters?.entityId) {
        conditions.push(eq(AuditLogs.EntityId, filters.entityId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db.select()
        .from(AuditLogs)
        .where(whereClause)
        .orderBy(desc(AuditLogs.Timestamp));

      if (filters?.limit) {
        query.limit(filters.limit);
      }
      if (filters?.offset) {
        query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

}
