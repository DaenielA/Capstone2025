"use server";

import { db } from "@/db/connection";
import { PendingPayments, Members, Credits, Users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SendNotification } from "@/lib/notifications";

import { CreditRepository } from "@/db/repositories/CreditRepository";
import { MemberRepository } from "@/db/repositories/MemberRepository";

export async function acceptPayment(paymentId: number, memberId: number, amount: number) {
  if (!paymentId || !memberId || isNaN(amount) || amount <= 0) {
    return { error: "Invalid input provided." };
  }

  try {
    // 1. Process the payment using the central repository method.
    // This correctly allocates payments to outstanding credit items (FIFO).
    const paymentResult = await CreditRepository.processPayment(memberId, amount);

    if (!paymentResult || !paymentResult.success) {
      // If payment processing fails, return the error and don't approve the pending payment.
      return { error: paymentResult.message || "Payment processing failed." };
    }

    // 2. Synchronize the member's overall credit balance to ensure it's up-to-date.
    await MemberRepository.synchronizeCreditBalance(memberId);

    // 3. If payment was successful, update the status of the original pending payment request.
    const [updatedPayment] = await db
      .update(PendingPayments)
      .set({ Status: 'approved', UpdatedAt: new Date() })
      .where(eq(PendingPayments.PendingPaymentId, paymentId))
      .returning();

    if (!updatedPayment) {
      // This is an edge case. The payment was processed, but the pending request status failed to update.
      // This should be logged for manual review.
      console.error(`CRITICAL: Payment for member ${memberId} (amount: ${amount}) was processed successfully, but failed to update the status of PendingPayment ID ${paymentId}.`);
      // Inform the admin, but consider the primary action (payment) successful.
      return { success: "Payment was processed, but the request status failed to update. Please notify support." };
    }

    // 4. Create a notification for the member (outside of transaction)
    try {
      const memberInfo = await db.select({
          name: Members.Name,
          email: Users.Email,
      }).from(Members)
        .leftJoin(Users, eq(Members.UserId, Users.UserId))
        .where(eq(Members.MemberId, memberId))
        .limit(1);

      if (memberInfo[0] && memberInfo[0].email && memberInfo[0].name) {
          await SendNotification(
              'credit_payment',
              "Payment Approved",
              `Your credit payment of ₱${amount.toFixed(2)} has been approved.`,
              { link: "/members/credit", memberId },
              { email: memberInfo[0].email, name: memberInfo[0].name }
          );
      }
    } catch (e) {
      console.error("Failed to send approval notification:", e);
    }

    // Revalidate paths to update the UI
    revalidatePath("/admin/credit-settings/pending-payments");
    revalidatePath(`/members/credit`); // Revalidate member's view
    revalidatePath(`/members`); // Revalidate member's dashboard

    return { success: "Payment approved successfully." };
  } catch (error) {
    console.error("Error accepting payment:", error);
    // The transaction will be rolled back automatically on error
    return { error: "An unexpected error occurred while approving the payment." };
  }
}

export async function rejectPayment(paymentId: number) {
  if (!paymentId) {
    return { error: "Invalid payment ID." };
  }

  try {
    const [rejectedPayment] = await db
      .update(PendingPayments)
      .set({ Status: 'rejected', UpdatedAt: new Date() })
      .where(eq(PendingPayments.PendingPaymentId, paymentId))
      .returning({ memberId: PendingPayments.MemberId, amount: PendingPayments.Amount });

    if (rejectedPayment?.memberId && rejectedPayment?.amount) {
      // Create a notification for the member
      try {
        const memberInfo = await db.select({
            name: Members.Name,
            email: Users.Email,
        }).from(Members)
          .leftJoin(Users, eq(Members.UserId, Users.UserId))
          .where(eq(Members.MemberId, rejectedPayment.memberId))
          .limit(1);

        if (memberInfo[0] && memberInfo[0].email && memberInfo[0].name) {
            await SendNotification(
                'credit_payment',
                "Payment Rejected",
                `Your credit payment of ₱${rejectedPayment.amount} was rejected. Please contact an admin for more information.`,
                { link: "/members/credit", memberId: rejectedPayment.memberId },
                { email: memberInfo[0].email, name: memberInfo[0].name }
            );
        }
      } catch(e) {
          console.error("Failed to send rejection notification:", e);
      }
    }

    revalidatePath("/admin/credit-settings/pending-payments");

    return { success: "Payment rejected successfully." };
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return { error: "An unexpected error occurred while rejecting the payment." };
  }
}