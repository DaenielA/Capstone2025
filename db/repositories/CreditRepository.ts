import { db } from '../connection';
import { Credits, Members, CreditSettings, PaymentSchedule, Transactions, TransactionItems, Products } from '../schema';
import { eq, and, gte, lte, desc, asc, inArray, gt } from 'drizzle-orm';
import { MemberRepository } from './MemberRepository';

/**
 * Interface for the data required to create a credit purchase.
 * This aligns with the data from the API route.
 */
interface CreditPurchaseCreationData {
  UserId: number; // Assuming UserId is a number based on your other repos
  ProductId: number; // Assuming ProductId is a number
  BaseAmount: string;
  MarkupAmount: string;
  TotalAmount: string;
  PurchaseDate: Date;
  Status: 'UNPAID' | 'PAID' | 'LATE';
}

/**
 * Repository for Credit data access
 */
export class CreditRepository {
  /**
   * Get credit records for a member by type
   * @param memberId - The ID of the member
   * @param type - The type of credit record (e.g., 'Earned', 'Spent')
   */
  static async GetByMemberIdAndType(memberId: number, type: 'Earned' | 'Spent' | 'Adjustment' | 'Payment') {
    try {
      return await db.select()
        .from(Credits)
        .where(and(eq(Credits.MemberId, memberId), eq(Credits.Type, type)));
    } catch (error) {
      console.error(`Error getting credits for member ${memberId} of type ${type}:`, error);
      throw error;
    }
  }

  /**
   * Calculate interest accrued for a member using proper daily compounding
   * @param memberId - The ID of the member
   */
  static async calculateInterest(memberId: number) {
    try {
      const member = await db.select().from(Members).where(eq(Members.MemberId, memberId)).limit(1);
      if (!member.length) throw new Error('Member not found');

      const settings = await this.getCreditSettings();
      if (!settings) throw new Error('Credit settings not found');

      const creditBalance = parseFloat(member[0].CreditBalance);
      if (creditBalance <= 0) return 0; // No interest on zero or negative balance

      const monthlyInterestRate = parseFloat(settings.InterestRate) / 100;
      const gracePeriodDays = settings.GracePeriodDays;

      // Get credit transactions older than grace period that contributed to current balance
      const gracePeriodDate = new Date();
      gracePeriodDate.setDate(gracePeriodDate.getDate() - gracePeriodDays);

      const creditTransactions = await db.select()
        .from(Credits)
        .where(and(
          eq(Credits.MemberId, memberId),
          eq(Credits.Type, 'Spent'),
          lte(Credits.Timestamp, gracePeriodDate)
        ))
        .orderBy(desc(Credits.Timestamp));

      if (creditTransactions.length === 0) return 0;

      // Calculate interest based on outstanding balance over time
      // Use daily compounding: balance * (1 + monthly_rate/30)^days - balance
      const now = new Date();
      let totalInterest = 0;

      // For simplicity, calculate interest on the current balance
      // assuming it has been outstanding since the oldest unpaid transaction
      const oldestTransaction = creditTransactions[creditTransactions.length - 1];
      const daysOutstanding = Math.max(1, Math.floor((now.getTime() - new Date(oldestTransaction.Timestamp).getTime()) / (1000 * 60 * 60 * 24)));

      // Daily interest rate = monthly rate / 30
      const dailyRate = monthlyInterestRate / 30;

      // Compound daily: balance * (1 + daily_rate)^days - balance
      totalInterest = creditBalance * (Math.pow(1 + dailyRate, daysOutstanding) - 1);

      return Math.max(0, totalInterest); // Ensure non-negative
    } catch (error) {
      console.error(`Error calculating interest for member ${memberId}:`, error);
      throw error;
    }
  }


  /**
   * Apply interest to member's credit balance
   * @param memberId - The ID of the member
   */
  static async applyInterest(memberId: number) {
    try {
      const interestAmount = await this.calculateInterest(memberId);
      if (interestAmount > 0) {
        // Create interest charge record linked to a transaction
        const interestRecord = await db.insert(Credits).values({
          MemberId: memberId,
          Amount: interestAmount.toFixed(2),
          Type: 'Adjustment',
          Notes: `Interest accrued on credit balance`,
          Timestamp: new Date(),
        }).returning();

        // Update member's credit balance
        const member = await db.select().from(Members).where(eq(Members.MemberId, memberId)).limit(1);
        if (member.length) {
          const newBalance = parseFloat(member[0].CreditBalance) + interestAmount;
          await db.update(Members)
            .set({ CreditBalance: newBalance.toFixed(2) })
            .where(eq(Members.MemberId, memberId));
        }

        return interestAmount;
      }
      return 0;
    } catch (error) {
      console.error(`Error applying interest for member ${memberId}:`, error);
      throw error;
    }
  }


  /**
   * Get credit settings
   */
  static async getCreditSettings() {
    try {
      const settings = await db.select().from(CreditSettings).limit(1);
      return settings.length > 0 ? settings[0] : null;
    } catch (error) {
      console.error('Error getting credit settings:', error);
      throw error;
    }
  }

  /**
   * Update credit settings
   */
  static async updateCreditSettings(settings: typeof CreditSettings.$inferInsert) {
    try {
      const existing = await this.getCreditSettings();
      if (existing) {
        return await db.update(CreditSettings)
          .set({ ...settings, UpdatedAt: new Date() })
          .where(eq(CreditSettings.SettingId, existing.SettingId))
          .returning();
      } else {
        return await db.insert(CreditSettings).values(settings).returning();
      }
    } catch (error) {
      console.error('Error updating credit settings:', error);
      throw error;
    }
  }

  /**
   * Get payment schedule for a member
   */
  static async getPaymentSchedule(memberId: number) {
    try {
      return await db.select()
        .from(PaymentSchedule)
        .where(eq(PaymentSchedule.MemberId, memberId))
        .orderBy(desc(PaymentSchedule.DueDate));
    } catch (error) {
      console.error(`Error getting payment schedule for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Process late fees for overdue payments and mark schedules as overdue
   */
  static async processLateFees(memberId: number) {
    try {
      const settings = await this.getCreditSettings();
      if (!settings) return 0;

      // First, mark overdue payments
      const now = new Date();
      await db.update(PaymentSchedule)
        .set({ Status: 'overdue', UpdatedAt: now })
        .where(and(
          eq(PaymentSchedule.MemberId, memberId),
          eq(PaymentSchedule.Status, 'pending'),
          lte(PaymentSchedule.DueDate, now)
        ));

      // Then process late fees for newly overdue payments
      const overduePayments = await db.select()
        .from(PaymentSchedule)
        .where(and(
          eq(PaymentSchedule.MemberId, memberId),
          eq(PaymentSchedule.Status, 'overdue')
        ));

      let totalLateFees = 0;
      for (const payment of overduePayments) {
        // Check if late fee already applied for this payment
        const existingFee = await db.select()
          .from(Credits)
          .where(and(
            eq(Credits.MemberId, memberId),
            eq(Credits.Type, 'Adjustment'),
            eq(Credits.Notes, `Late fee for overdue payment ${payment.ScheduleId}`)
          ));

        if (existingFee.length === 0) {
          const lateFeeAmount = Math.max(
            parseFloat(settings.LateFeeAmount),
            (parseFloat(payment.Amount) * parseFloat(settings.LateFeePercentage)) / 100
          );

          await db.insert(Credits).values({
            MemberId: memberId,
            Amount: lateFeeAmount.toFixed(2),
            Type: 'Adjustment',
            Notes: `Late fee for overdue payment ${payment.ScheduleId}`,
            Timestamp: now,
          });

          totalLateFees += lateFeeAmount;
        }
      }

      return totalLateFees;
    } catch (error) {
      console.error(`Error processing late fees for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get members whose credit payments are nearing penalty (e.g., 5 days before)
   */
  static async getMembersNearingPenalty(daysBeforePenalty: number) {
    try {
      const now = new Date();
      const membersNearingPenalty: {
        memberId: number;
        memberName: string;
        memberEmail: string;
        creditAmount: number;
        dueDate: Date;
      }[] = [];

      const settings = await this.getCreditSettings();
      if (!settings || settings.creditDueDays === null || settings.creditDueDays === undefined) {
        console.warn('Credit settings or creditDueDays not found or undefined. Cannot check for impending penalties.');
        return [];
      }

      const penaltyThresholdDays = settings.creditDueDays;

      // Fetch all members with an outstanding credit balance
      const membersWithCredit = await db.select()
        .from(Members)
        .where(gte(Members.CreditBalance, '0.01')); // Only members with positive balance

      for (const member of membersWithCredit) {
        const memberId = member.MemberId;
        const memberName = member.Name;
        const memberEmail = member.Email;
        const currentCreditBalance = parseFloat(member.CreditBalance);

        // Get payment schedules for the member
        const paymentSchedules = await db.select()
          .from(PaymentSchedule)
          .where(and(
            eq(PaymentSchedule.MemberId, memberId),
            eq(PaymentSchedule.Status, 'pending') // Only consider pending payments
          ));

        for (const schedule of paymentSchedules) {
          const dueDate = new Date(schedule.DueDate);
          // The penalty is applied `penaltyThresholdDays` after `dueDate`.
          // So, the date a penalty is *applied* is `dueDate + penaltyThresholdDays`.
          // We want to notify `daysBeforePenalty` *before* the penalty is applied.
          // Notification date = (dueDate + penaltyThresholdDays) - daysBeforePenalty

          const penaltyDate = new Date(dueDate);
          penaltyDate.setDate(penaltyDate.getDate() + penaltyThresholdDays);

          const notificationDate = new Date(penaltyDate);
          notificationDate.setDate(notificationDate.getDate() - daysBeforePenalty);

          // Check if today is the notification date
          const isTodayNotificationDate =
            now.getFullYear() === notificationDate.getFullYear() &&
            now.getMonth() === notificationDate.getMonth() &&
            now.getDate() === notificationDate.getDate();

          if (isTodayNotificationDate) {
            membersNearingPenalty.push({
              memberId,
              memberName,
              memberEmail,
              creditAmount: currentCreditBalance, // Use current balance
              dueDate: penaltyDate, // Show the actual penalty date
            });
            break; // Only one notification per member per day for now to avoid spam
          }
        }
      }

      return membersNearingPenalty;
    } catch (error) {
      console.error('Error getting members nearing penalty:', error);
      throw error;
    }
  }


  /**
   * Creates a new credit purchase record in the database.
   * This will add a 'Spent' record to the Credits table.
   * @param data - The data for the new credit purchase.
   */
  static async createCreditPurchase(data: CreditPurchaseCreationData, transactionId?: number) {
    try {
      // Get MemberId from UserId
      const member = await db.select()
        .from(Members)
        .where(eq(Members.UserId, data.UserId))
        .limit(1);

      if (!member.length) {
        throw new Error(`Member not found for UserId ${data.UserId}`);
      }

      const memberId = member[0].MemberId;

      const creditRecord = await db.insert(Credits).values({
        MemberId: memberId,
        Amount: data.TotalAmount,
        Type: 'Spent',
        RelatedTransactionId: transactionId,
        Notes: `Purchase of product ${data.ProductId}. Markup: ${data.MarkupAmount}.`,
        Timestamp: data.PurchaseDate,
      }).returning();

      // Update member's credit balance
      const currentBalance = parseFloat(member[0].CreditBalance);
      const newBalance = currentBalance + parseFloat(data.TotalAmount);

      await db.update(Members)
        .set({ CreditBalance: newBalance.toFixed(2) })
        .where(eq(Members.MemberId, memberId));

      return creditRecord;
    } catch (error) {
      console.error('Error creating credit purchase:', error);
      throw error;
    }
  }

  /**
   * Process a payment (partial or full) for a member using FIFO across unpaid credit transactions
   * @param memberId - The ID of the member
   * @param amount - The amount to apply as payment
   * @param options - { full?: boolean }
   */
  static async processPayment(memberId: number, amount: number, options?: { full?: boolean }) {
    try {
      const member = await db.select().from(Members).where(eq(Members.MemberId, memberId)).limit(1);
      if (!member.length) throw new Error('Member not found');

      const currentBalance = parseFloat(member[0].CreditBalance);
      if (currentBalance <= 0 && !options?.full) { // Allow full payment attempt on 0 balance to fix inconsistencies
        return { success: false, message: 'No outstanding credit to pay', applied: 0, newBalance: 0 };
      }

      if (options?.full) {
        amount = currentBalance;
      }
      
      if (amount <= 0) {
        return { success: false, message: 'Amount must be greater than zero', applied: 0, newBalance: currentBalance };
      }

      // Cap payment at current balance
      if (amount > currentBalance) {
        amount = currentBalance;
      }

      let remainingPayment = amount;
      const appliedPayments: any[] = [];
      const now = new Date();

      // Fetch all outstanding debits for this member, in FIFO order
      const outstandingDebits = await db.select().from(Credits).where(
        and(
          eq(Credits.MemberId, memberId),
          inArray(Credits.Type, ['Spent', 'Adjustment']),
          inArray(Credits.Status, ['pending', 'partially_paid'])
        )
      ).orderBy(asc(Credits.Timestamp));

      if (remainingPayment > 0) {
        await db.transaction(async (tx) => {
          // Create a single, master payment record for this entire payment event
          await tx.insert(Credits).values({
            MemberId: memberId,
            Amount: amount.toFixed(2),
            Type: 'Payment',
            Status: 'fully_paid', // A payment itself is always considered complete
            Notes: `Payment of ${amount.toFixed(2)} received.`,
            Timestamp: now
          }).returning();

          for (const debit of outstandingDebits) {
            if (remainingPayment <= 0) break;

            const unpaidOnThisDebit = parseFloat(debit.Amount) - parseFloat(debit.PaidAmount || '0');
            if (unpaidOnThisDebit <= 0) continue;

            const amountToApply = Math.min(remainingPayment, unpaidOnThisDebit);

            const newPaidAmount = parseFloat(debit.PaidAmount || '0') + amountToApply;
            const newStatus = newPaidAmount >= parseFloat(debit.Amount) ? 'fully_paid' : 'partially_paid';

            await tx.update(Credits).set({
              PaidAmount: newPaidAmount.toFixed(2),
              Status: newStatus,
              UpdatedAt: now
            }).where(eq(Credits.CreditId, debit.CreditId));

            appliedPayments.push({
              appliedToCreditId: debit.CreditId,
              amount: amountToApply,
              relatedTransactionId: debit.RelatedTransactionId
            });

            remainingPayment -= amountToApply;
          }
        });
      }

      // After allocations, synchronize the member's main credit balance
      const newBalance = await MemberRepository.synchronizeCreditBalance(memberId);
      const appliedTotal = amount - remainingPayment;

      return { success: true, applied: appliedTotal, appliedPayments, newBalance };

    } catch (error) {
      console.error(`Error processing payment for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get unpaid items for a member (from payment schedules)
   * @param memberId - The ID of the member
   */
  static async getUnpaidItems(memberId: number) {
    try {
      const unpaidSchedules = await db.select({
        ScheduleId: PaymentSchedule.ScheduleId,
        Amount: PaymentSchedule.Amount,
        PaidAmount: PaymentSchedule.PaidAmount,
        DueDate: PaymentSchedule.DueDate,
        Status: PaymentSchedule.Status,
        TransactionId: PaymentSchedule.TransactionId,
      })
      .from(PaymentSchedule)
      .where(and(
        eq(PaymentSchedule.MemberId, memberId),
        eq(PaymentSchedule.Status, 'pending')
      ));

      return unpaidSchedules.map(schedule => ({
        scheduleId: schedule.ScheduleId,
        transactionId: schedule.TransactionId,
        amount: parseFloat(schedule.Amount),
        paidAmount: parseFloat(schedule.PaidAmount || '0'),
        unpaidAmount: parseFloat(schedule.Amount) - parseFloat(schedule.PaidAmount || '0'),
        dueDate: schedule.DueDate,
        status: schedule.Status,
      }));
    } catch (error) {
      console.error(`Error getting unpaid items for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get credit payments for a member
   * @param memberId - The ID of the member
   */
  static async getCreditPayments(memberId: number) {
    try {
      const payments = await db.select({
        CreditId: Credits.CreditId,
        Amount: Credits.Amount,
        Type: Credits.Type,
        RelatedTransactionId: Credits.RelatedTransactionId,
        Timestamp: Credits.Timestamp,
        Notes: Credits.Notes,
      })
      .from(Credits)
      .where(and(
        eq(Credits.MemberId, memberId),
        eq(Credits.Type, 'Payment')
      ))
      .orderBy(desc(Credits.Timestamp));

      return payments.map(payment => ({
        creditId: payment.CreditId,
        amount: parseFloat(payment.Amount),
        type: payment.Type,
        relatedTransactionId: payment.RelatedTransactionId,
        timestamp: payment.Timestamp,
        notes: payment.Notes,
      }));
    } catch (error) {
      console.error(`Error getting credit payments for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Get running balance for a member (total spent + adjustments - payments - earned)
   * @param memberId - The ID of the member
   */
  static async getRunningBalance(memberId: number): Promise<number> {
    try {
      const creditRecords = await db.select()
        .from(Credits)
        .where(eq(Credits.MemberId, memberId));

      let balance = 0;
      for (const record of creditRecords) {
        const amount = parseFloat(record.Amount);
        switch (record.Type) {
          case 'Spent':
          case 'Adjustment':
            balance += amount;
            break;
          case 'Payment':
          case 'Earned':
            balance -= amount;
            break;
        }
      }

      return balance;
    } catch (error) {
      console.error(`Error calculating running balance for member ${memberId}:`, error);
      throw error;
    }
  }

  /**
   * Applies product-specific credit penalties to overdue product-linked credits.
   * This function should be called periodically (e.g., daily) by a cron job.
   */
  static async applyProductCreditPenalties(): Promise<void> {
    try {
      console.log('Running applyProductCreditPenalties...');
      const now = new Date();

      // Find all 'Spent' credits that are linked to a product and are not yet fully paid
      // and for which the CreditDueDays has passed.
      const overdueProductCredits = await db.select({
        creditId: Credits.CreditId,
        memberId: Credits.MemberId,
        creditAmount: Credits.Amount,
        creditPaidAmount: Credits.PaidAmount,
        creditTimestamp: Credits.Timestamp,
        productId: TransactionItems.ProductId,
        productCreditDueDays: Products.CreditDueDays,
        productCreditPenaltyType: Products.CreditPenaltyType,
        productCreditPenaltyValue: Products.CreditPenaltyValue,
        transactionTotalAmount: Transactions.TotalAmount,
        // transactionMarkupAmount: Transactions.CreditMarkupAmount, // if needed for base calculation
      })
      .from(Credits)
      .innerJoin(Transactions, eq(Credits.RelatedTransactionId, Transactions.TransactionId))
      .innerJoin(TransactionItems, eq(Transactions.TransactionId, TransactionItems.TransactionId))
      .innerJoin(Products, eq(TransactionItems.ProductId, Products.ProductId))
      .where(and(
        eq(Credits.Type, 'Spent'),
        // Check if there's an outstanding balance on the credit
        gt(Credits.Amount, Credits.PaidAmount ?? '0.00'), // Check if there's an outstanding balance on the credit
        Products.CreditDueDays.notNull()
      ));

      for (const credit of overdueProductCredits) {
        if (!credit.productCreditDueDays || !credit.productCreditPenaltyType || !credit.productCreditPenaltyValue) {
          continue; // Skip if any penalty-related product settings are missing
        }

        // Calculate the actual due date for this specific credit
        const transactionTimestamp = new Date(credit.creditTimestamp);
        const penaltyDueDate = new Date(transactionTimestamp);
        penaltyDueDate.setDate(transactionTimestamp.getDate() + credit.productCreditDueDays);

        // Only apply if the penalty due date has passed
        if (now > penaltyDueDate) {
          // Check if a penalty for this credit has already been applied to prevent duplicates
          // A penalty for the same original credit (RelatedTransactionId) and type 'Adjustment'
          const existingPenalty = await db.select()
            .from(Credits)
            .where(and(
              eq(Credits.RelatedTransactionId, credit.creditId), // Link to the original 'Spent' credit record
              eq(Credits.Type, 'Adjustment'),
              // You might want a more specific note or a 'Subtype' for product penalties
              eq(Credits.Notes, `Product credit penalty for credit ${credit.creditId}`)
            ));

          if (existingPenalty.length === 0) {
            let penaltyAmount = 0;
            // The outstanding amount for this specific credit transaction item
            const outstandingAmount = parseFloat(credit.creditAmount) - parseFloat(credit.creditPaidAmount || '0');

            if (credit.productCreditPenaltyType === 'percentage') {
              penaltyAmount = (outstandingAmount * parseFloat(credit.productCreditPenaltyValue)) / 100;
            } else if (credit.productCreditPenaltyType === 'fixed') {
              penaltyAmount = parseFloat(credit.productCreditPenaltyValue);
            }

            if (penaltyAmount > 0) {
              await db.transaction(async (tx) => {
                // Insert the penalty as an adjustment credit
                await tx.insert(Credits).values({
                  MemberId: credit.memberId,
                  Amount: penaltyAmount.toFixed(2),
                  Type: 'Adjustment',
                  Notes: `Product credit penalty for credit ${credit.creditId}`,
                  Timestamp: now,
                  RelatedTransactionId: credit.creditId, // Link to the original 'Spent' credit record
                }).returning();

                // Update member's total credit balance
                // Assuming MemberRepository.synchronizeCreditBalance can be called static or instantiated
                await MemberRepository.synchronizeCreditBalance(credit.memberId, tx);
                console.log(`Applied penalty of ${penaltyAmount.toFixed(2)} to member ${credit.memberId} for credit ${credit.creditId}`);
              });
            }
          }
        }
      }
      console.log('Finished applyProductCreditPenalties.');
    } catch (error) {
      console.error('Error in applyProductCreditPenalties:', error);
      throw error;
    }
  }
}