import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { PaymentSchedule, Transactions, TransactionItems, Products } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = parseInt(params.id);

    if (isNaN(memberId)) {
      return NextResponse.json({
        success: false,
        message: "Invalid member ID"
      }, { status: 400 });
    }

    // Get unpaid payment schedules with transaction and item details
    const unpaidItems = await db.select({
      ScheduleId: PaymentSchedule.ScheduleId,
      TransactionId: PaymentSchedule.TransactionId,
      InstallmentNumber: PaymentSchedule.InstallmentNumber,
      TotalInstallments: PaymentSchedule.TotalInstallments,
      Amount: PaymentSchedule.Amount,
      PaidAmount: PaymentSchedule.PaidAmount,
      DueDate: PaymentSchedule.DueDate,
      Status: PaymentSchedule.Status,
      // Transaction details
      TransactionDate: Transactions.Timestamp,
      // Item details through TransactionItems
      ItemDetails: {
        ProductName: Products.Name,
        Quantity: TransactionItems.Quantity,
        PriceAtTimeOfSale: TransactionItems.PriceAtTimeOfSale,
        BasePriceAtTimeOfSale: TransactionItems.BasePriceAtTimeOfSale,
      }
    })
    .from(PaymentSchedule)
    .leftJoin(Transactions, eq(PaymentSchedule.TransactionId, Transactions.TransactionId))
    .leftJoin(TransactionItems, eq(Transactions.TransactionId, TransactionItems.TransactionId))
    .leftJoin(Products, eq(TransactionItems.ProductId, Products.ProductId))
    .where(and(
      eq(PaymentSchedule.MemberId, memberId),
      eq(PaymentSchedule.Status, 'pending')
    ))
    .orderBy(asc(PaymentSchedule.DueDate), asc(PaymentSchedule.InstallmentNumber));

    // Group by schedule to combine multiple items per transaction
    const groupedItems = unpaidItems.reduce((acc: any[], item) => {
      const existing = acc.find(i => i.ScheduleId === item.ScheduleId);

      if (existing) {
        // Add item details to existing schedule
        if (item.ItemDetails && item.ItemDetails.ProductName) {
          existing.items.push(item.ItemDetails);
        }
      } else {
        // Create new schedule entry
        acc.push({
          scheduleId: item.ScheduleId,
          transactionId: item.TransactionId,
          installmentNumber: item.InstallmentNumber,
          totalInstallments: item.TotalInstallments,
          amount: parseFloat(item.Amount),
          paidAmount: parseFloat(item.PaidAmount),
          unpaidAmount: parseFloat(item.Amount) - parseFloat(item.PaidAmount),
          dueDate: item.DueDate.toISOString().split('T')[0],
          status: item.Status,
          transactionDate: item.TransactionDate?.toISOString().split('T')[0],
          items: item.ItemDetails && item.ItemDetails.ProductName ? [item.ItemDetails] : []
        });
      }

      return acc;
    }, []);

    // Calculate total unpaid amount
    const totalUnpaid = groupedItems.reduce((sum, item) => sum + item.unpaidAmount, 0);

    return NextResponse.json({
      success: true,
      unpaidItems: groupedItems,
      totalUnpaid,
      itemCount: groupedItems.length
    });

  } catch (error: any) {
    console.error(`Error retrieving unpaid items for member:`, error);

    return NextResponse.json({
      success: false,
      message: `Error retrieving unpaid items: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
