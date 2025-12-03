import { NextResponse } from 'next/server';
import { TransactionRepository } from '@/db/repositories/TransactionRepository';
import { db } from '@/db/connection';
import { Transactions } from '@/db/schema';
import { and, gte, lte, desc } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ status: 'error', message: 'Missing startDate or endDate' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999); // Include the whole end day
    
    const transactions = await db.query.Transactions.findMany({
        where: and(
            gte(Transactions.Timestamp, startDate),
            lte(Transactions.Timestamp, endDate)
        ),
        with: {
            User: {
                columns: {
                    Name: true,
                },
            },
        },
        orderBy: [desc(Transactions.Timestamp)],
    });
    
    const sales = [];
    for (const transaction of transactions) {
      const items = await TransactionRepository.GetItemsByTransactionId(transaction.TransactionId);
      if (items) {
        for (const item of items) {
          const price = parseFloat(item.PriceAtTimeOfSale);
          const quantity = Number(item.Quantity);
          const profit = parseFloat(item.Profit ?? '0.00');
          sales.push({
            id: transaction.TransactionId,
            productName: item.Product?.Name || 'N/A',
            quantity: quantity,
            price: price,
            total: quantity * price,
            profit: profit,
            createdAt: transaction.Timestamp.toISOString(),
            cashierName: transaction.User?.Name || 'N/A',
            paymentMethod: transaction.PaymentMethod,
          });
        }
      }
    }
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.profit, 0);
    
    const report = {
      totalRevenue,
      totalSales: sales.length,
      totalProfit,
      sales: sales,
    };

    return NextResponse.json({ status: 'success', report });

  } catch (error) {
    console.error("Error in /api/sales:", error);
    return NextResponse.json({ status: 'error', message: 'Internal ServerError' }, { status: 500 });
  }
}