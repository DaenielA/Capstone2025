"use server"

import { db } from "@/db";
import { Members, Transactions, TransactionItems, Products, Credits, PaymentSchedule } from "@/db/schema";
import { eq, sum, sql, and, or } from "drizzle-orm";
import { GetCurrentSession } from "@/lib/auth";

export interface Purchase {
  Id: string;
  Date: string;
  Items: number;
  Total: number;
  Status: string;
  ItemDetails?: {
    TransactionItemId: string;
    ProductId: string;
    Name: string;
    Quantity: number;
    PieceUnitName?: string;
    Price: number;
  }[];
}

export interface Payment {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  date: string;
  method: string;
  status: string;
}

export interface CreditItem {
  CreditId: string;
  MemberId: string;
  Amount: string;
  PaidAmount: string;
  Status: string; // 'pending', 'partially_paid', 'fully_paid'
  Type: string; // 'Earned', 'Spent', 'Adjustment', 'Payment'
  RelatedTransactionId?: string;
  Notes?: string | null;
  Timestamp: string;
  CreatedAt: string;
  UpdatedAt: string;
  // New fields for product-specific credit due days and penalties
  creditDueDays?: number;
  creditPenaltyType?: 'percentage' | 'fixed';
  creditPenaltyValue?: string;
  originalPurchaseDate?: string; // Timestamp of the original transaction
  calculatedDueDate?: string;
  isOverdue?: boolean;
  isPenaltyApplied?: boolean;
}

export interface MemberProfileData {
  Name: string;
  joinDate: string;
  memberID: string;
  availableCredit: number;
  CreditBalance: number;
  creditUtilization: number;
  CreditLimit: number;
  email?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  purchaseHistory: Purchase[];
  upcomingPayments: Payment[];
  recentItems: {
    name: string;
    quantity: number;
    date: string;
    price: number;
  }[];
  paymentHistory: Payment[];
  creditItems: CreditItem[];
}

export async function GetCurrentMemberData(): Promise<MemberProfileData | null> {
  const session = await GetCurrentSession();
  if (!session || !session.UserId) {
    return null;
  }

  const member = await db.query.Members.findFirst({
    where: eq(Members.UserId, parseInt(session.UserId)),
  });

  if (!member) {
    return null;
  }

  const purchases = await db.query.Transactions.findMany({
    where: eq(Transactions.MemberId, member.MemberId),
    with: {
      TransactionItems: {
        with: {
          Product: true,
        },
      },
    },
  });

  // Build purchase history and determine statuses using Credits (payments) and PaymentMethod
  const purchaseHistory: Purchase[] = [];
  for (const p of purchases) {
    // Default status for cash transactions
    let status = p.PaymentMethod === 'credit' ? 'Pending' : 'Completed';

    if (p.PaymentMethod === 'credit') {
      // Get all the 'Spent' credit records for this transaction to determine the real status
      const spentCredits = await db
        .select({ Amount: Credits.Amount, PaidAmount: Credits.PaidAmount })
        .from(Credits)
        .where(and(
          eq(Credits.RelatedTransactionId, p.TransactionId),
          eq(Credits.Type, 'Spent')
        ));

      if (spentCredits.length > 0) {
        // Calculate totals in cents to avoid floating-point issues
        const totalSpentInCents = spentCredits.reduce((sum, c) => sum + Math.round(parseFloat(c.Amount) * 100), 0);
        const totalPaidInCents = spentCredits.reduce((sum, c) => sum + Math.round(parseFloat(c.PaidAmount || '0') * 100), 0);

        if (totalPaidInCents >= totalSpentInCents) {
          status = 'Paid';
        } else if (totalPaidInCents > 0) {
          status = 'Partial';
        } else {
          status = 'Pending';
        }
      }
      // If no spent credits are found for a 'credit' transaction, it remains 'Pending' by default.
    }

    purchaseHistory.push({
      Id: p.TransactionId.toString(),
      Date: p.Timestamp.toISOString(),
      Items: p.TransactionItems.length,
      Total: Number(p.TotalAmount),
      Status: status,
      ItemDetails: p.TransactionItems.map((ti) => ({
        TransactionItemId: ti.TransactionItemId.toString(),
        ProductId: ti.ProductId.toString(),
        Name: ti.Product.Name,
        Quantity: Number(ti.Quantity),
        PieceUnitName: ti.PieceUnitName || 'Unit',
        Price: Number(ti.PriceAtTimeOfSale),
      })),
    });
  }

  const allCreditRecords = await db.query.Credits.findMany({
    where: eq(Credits.MemberId, member.MemberId),
    orderBy: Credits.Timestamp,
    with: {
      RelatedTransaction: {
        with: {
          TransactionItems: {
            with: {
              Product: true,
            },
          },
        },
      },
    },
  });

  const creditItems: CreditItem[] = allCreditRecords.map(credit => {
    let creditDueDays: number | undefined;
    let creditPenaltyType: 'percentage' | 'fixed' | undefined;
    let creditPenaltyValue: string | undefined;
    let originalPurchaseDate: string | undefined;
    let calculatedDueDate: string | undefined;
    let isOverdue: boolean | undefined;

    const now = new Date();

    if (credit.Type === 'Spent' && credit.RelatedTransaction?.TransactionItems && credit.RelatedTransaction.TransactionItems.length > 0) {
      const product = credit.RelatedTransaction.TransactionItems[0].Product;
      if (product) {
        creditDueDays = product.CreditDueDays ?? undefined;
        creditPenaltyType = product.CreditPenaltyType ?? undefined;
        creditPenaltyValue = product.CreditPenaltyValue ?? undefined;
        originalPurchaseDate = credit.Timestamp.toISOString();

        if (creditDueDays !== undefined) {
          const purchaseDate = new Date(credit.Timestamp);
          const dueDate = new Date(purchaseDate);
          dueDate.setDate(purchaseDate.getDate() + creditDueDays);
          calculatedDueDate = dueDate.toISOString();
          isOverdue = now > dueDate && credit.Status !== 'fully_paid';
        }

        console.log(`--- Credit Item Debugging ---`);
        console.log(`CreditId: ${credit.CreditId}`);
        console.log(`Credit Type: ${credit.Type}`);
        console.log(`Credit Timestamp (Original): ${credit.Timestamp}`);
        console.log(`Product CreditDueDays: ${creditDueDays}`);
        console.log(`Calculated Due Date (Frontend): ${calculatedDueDate}`);
        console.log(`Is Overdue (Frontend): ${isOverdue}`);
        console.log(`Current Time (Frontend): ${now.toISOString()}`);
        console.log(`IsPenaltyApplied from DB: ${credit.IsPenaltyApplied}`);
        console.log(`Credit Amount from DB: ${credit.Amount}`);
        console.log(`Credit Notes from DB: ${credit.Notes}`);
        console.log(`-----------------------------`);
      }
    }

    return {
      CreditId: credit.CreditId.toString(),
      MemberId: credit.MemberId.toString(),
      Amount: credit.Amount,
      PaidAmount: credit.PaidAmount || '0',
      Status: credit.Status,
      Type: credit.Type,
      RelatedTransactionId: credit.RelatedTransactionId?.toString(),
      Notes: credit.Notes, // Use the notes directly from the DB, which now includes penalty info
      Timestamp: credit.Timestamp.toISOString(),
      CreatedAt: credit.CreatedAt.toISOString(),
      UpdatedAt: credit.UpdatedAt.toISOString(),
      creditDueDays,
      creditPenaltyType,
      creditPenaltyValue,
      originalPurchaseDate,
      calculatedDueDate,
      isOverdue,
      isPenaltyApplied: credit.IsPenaltyApplied, // Map the new field
    };
  });

  return {
    Name: member.Name,
    joinDate: member.CreatedAt.toISOString(),
    memberID: member.MemberId.toString(),
    availableCredit: Number(member.CreditLimit) - Number(member.CreditBalance),
    CreditBalance: Number(member.CreditBalance),
    creditUtilization: Number(member.CreditLimit) > 0 ? (Number(member.CreditBalance) / Number(member.CreditLimit)) * 100 : 0,
    CreditLimit: Number(member.CreditLimit),
    email: member.Email,
    phone: member.Phone ?? undefined,
    address: member.Address ?? undefined,
    profilePicture: undefined, // Not stored in DB yet
    purchaseHistory,
    upcomingPayments: (await db.query.PaymentSchedule.findMany({
      where: and(
        eq(PaymentSchedule.MemberId, member.MemberId),
        or(
          eq(PaymentSchedule.Status, 'pending'),
          eq(PaymentSchedule.Status, 'overdue')
        )
      ),
      with: {
        Credit: {
          with: {
            RelatedTransaction: true,
          },
        },
      },
      orderBy: PaymentSchedule.DueDate,
    })).map(schedule => ({
      id: schedule.ScheduleId.toString(),
      description: schedule.Credit?.Notes || `Payment for Credit ${schedule.CreditId}`,
      dueDate: schedule.DueDate.toISOString(),
      amount: Number(schedule.Amount),
      date: schedule.CreatedAt.toISOString(), // Use CreatedAt for the 'date' field, or adjust as needed
      method: 'credit', // Assuming these are credit-related payments
      status: schedule.Status,
    })),
    recentItems: purchaseHistory
      .slice(0, 4)
      .flatMap((p) => p.ItemDetails || [])
      .map((item) => ({
        name: item.Name,
        quantity: item.Quantity,
        date: new Date().toLocaleDateString(),
        price: item.Price,
      })),
    paymentHistory: [],
    creditItems: creditItems,
  };
}

export async function updateMemberProfile(memberId: string, updates: { email?: string; phone?: string; address?: string }): Promise<boolean> {
  try {
    const updateData: Partial<typeof Members.$inferInsert> = {};
    if (updates.email !== undefined) updateData.Email = updates.email;
    if (updates.phone !== undefined) updateData.Phone = updates.phone;
    if (updates.address !== undefined) updateData.Address = updates.address;

    await db.update(Members).set(updateData).where(eq(Members.MemberId, parseInt(memberId)));
    return true;
  } catch (error) {
    console.error("Error updating member profile:", error);
    return false;
  }
}

export async function saveProfilePicture(memberId: string, imageData: string): Promise<boolean> {
  // Mock implementation - in a real app, you'd save to a file system or cloud storage
  // and store the URL/path in the database
  try {
    // For now, just return true to simulate success
    console.log(`Saving profile picture for member ${memberId}`);
    return true;
  } catch (error) {
    console.error("Error saving profile picture:", error);
    return false;
  }
}

export async function removeProfilePicture(memberId: string): Promise<boolean> {
  // Mock implementation - in a real app, you'd delete from storage and update DB
  try {
    // For now, just return true to simulate success
    console.log(`Removing profile picture for member ${memberId}`);
    return true;
  } catch (error) {
    console.error("Error removing profile picture:", error);
    return false;
  }
}
