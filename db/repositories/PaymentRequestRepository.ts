import { db } from '../connection';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../schema';

type DbOrTx = PostgresJsDatabase<typeof schema>;

/**
 * Repository for Payment Request data access
 */
export class PaymentRequestRepository {
  /**
   * Reject a payment request
   * @param paymentRequestId - The ID of the payment request
   * @param rejectedBy - The ID of the user rejecting the request
   * @param rejectionNotes - Optional notes for rejection
   * @param tx - Optional transaction object
   */
  static async reject(
    paymentRequestId: number,
    rejectedBy: number,
    rejectionNotes?: string,
    tx?: DbOrTx
  ) {
    const dbConnection = tx || db;
    try {
      const result = await dbConnection
        .update(schema.PaymentRequests)
        .set({
          Status: 'rejected',
          ApprovedBy: rejectedBy,
          ApprovedAt: new Date(),
          Notes: rejectionNotes,
          UpdatedAt: new Date(),
        })
        .where(eq(schema.PaymentRequests.PaymentRequestId, paymentRequestId))
        .returning();

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error rejecting payment request ${paymentRequestId}:`, error);
      throw error;
    }
  }

  /**
   * Get payment allocations for a payment request
   * @param paymentId - The ID of the payment
   */
  static async getAllocations(paymentId: number) {
    try {
      const allocations = await db
        .select({
          AllocationId: schema.PaymentAllocations.AllocationId,
          PaymentRequestId: schema.PaymentAllocations.PaymentRequestId,
          CreditId: schema.PaymentAllocations.CreditId,
          AllocatedAmount: schema.PaymentAllocations.AllocatedAmount,
          CreatedAt: schema.PaymentAllocations.CreatedAt,
          CreditItemId: schema.Credits.CreditItemId,
          CreditAmount: schema.Credits.Amount,
          PaidAmount: schema.Credits.PaidAmount,
          CreditStatus: schema.Credits.Status,
        })
        .from(schema.PaymentAllocations)
        .innerJoin(schema.PaymentRequests, eq(schema.PaymentAllocations.PaymentRequestId, schema.PaymentRequests.PaymentRequestId))
        .innerJoin(schema.Credits, eq(schema.PaymentAllocations.CreditId, schema.Credits.CreditId))
        .where(eq(schema.PaymentRequests.PaymentRequestId, paymentId));

      return allocations;
    } catch (error) {
      console.error(`Error getting allocations for payment ${paymentId}:`, error);
      throw error;
    }
  }
}
