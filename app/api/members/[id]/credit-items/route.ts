import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { Transactions, TransactionItems, Products, Credits } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET handler for retrieving credit items for a specific member
 */
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

    // Get all individual items from credit transactions for this member
    const creditItemsResult = await db
      .select({
        transactionId: Transactions.TransactionId,
        transactionDate: Transactions.Timestamp,
        productName: Products.Name,
        quantity: TransactionItems.Quantity,
        priceAtTimeOfSale: TransactionItems.PriceAtTimeOfSale,
        basePriceAtTimeOfSale: TransactionItems.BasePriceAtTimeOfSale,
        profitTotal: TransactionItems.Profit,
        creditStatus: Credits.Status,
      })
      .from(Transactions)
      .innerJoin(TransactionItems, eq(Transactions.TransactionId, TransactionItems.TransactionId))
      .innerJoin(Products, eq(TransactionItems.ProductId, Products.ProductId))
      .leftJoin(Credits, and(
        eq(Transactions.TransactionId, Credits.RelatedTransactionId),
        eq(Credits.Type, 'Spent')
      )) // Join to get the credit status for the purchase
      .where(and(
        eq(Transactions.MemberId, memberId),
        eq(Transactions.PaymentMethod, 'credit'),
      ))
      .orderBy(Transactions.Timestamp);


    // Map the results directly to the format the frontend expects
    const creditItems = creditItemsResult.map(item => ({
      transactionId: item.transactionId,
      transactionDate: new Date(item.transactionDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      productName: item.productName,
      quantity: Number(item.quantity),
      priceAtTimeOfSale: parseFloat(item.priceAtTimeOfSale),
      basePriceAtTimeOfSale: parseFloat(item.basePriceAtTimeOfSale || '0'),
      markupPerUnit: parseFloat(item.priceAtTimeOfSale) - parseFloat(item.basePriceAtTimeOfSale || '0'),
      profitTotal: parseFloat(item.profitTotal || '0'),
      originalTotal: Number(item.quantity) * parseFloat(item.basePriceAtTimeOfSale || '0'),
      total: Number(item.quantity) * parseFloat(item.priceAtTimeOfSale),
      markupCalculated: (Number(item.quantity) * parseFloat(item.priceAtTimeOfSale)) - (Number(item.quantity) * parseFloat(item.basePriceAtTimeOfSale || '0')),
      markupTotal: Number(item.quantity) * (parseFloat(item.priceAtTimeOfSale) - parseFloat(item.basePriceAtTimeOfSale || '0')),
      status: item.creditStatus || 'pending', // Default to pending if no status
    }));



    return NextResponse.json({
      success: true,
      creditItems
    });

  } catch (error: any) {
    console.error(`Error fetching member credit items:`, error);

    return NextResponse.json({
      success: false,
      message: `Error fetching member credit items: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
