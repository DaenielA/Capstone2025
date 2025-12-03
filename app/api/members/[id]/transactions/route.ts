import { NextResponse } from 'next/server';
import { db } from '@/db';
import { Transactions, Users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const memberId = parseInt(params.id, 10);

  if (isNaN(memberId)) {
    return NextResponse.json({ message: 'Invalid member ID' }, { status: 400 });
  }

  try {
    const memberTransactions = await db
      .select({
        id: Transactions.TransactionId,
        date: Transactions.Timestamp,
        time: Transactions.Timestamp,
        totalAmount: Transactions.TotalAmount,
        paymentMethod: Transactions.PaymentMethod,
        cashierName: Users.Name,
      })
      .from(Transactions)
      .leftJoin(Users, eq(Transactions.UserId, Users.UserId))
      .where(eq(Transactions.MemberId, memberId))
      .orderBy(desc(Transactions.Timestamp));

    const formattedTransactions = memberTransactions.map(t => ({
        ...t,
        date: t.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: t.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    }));

    return NextResponse.json({ transactions: formattedTransactions });
  } catch (error) {
    console.error('Error fetching purchase history:', error);
    return NextResponse.json({ message: 'Failed to fetch purchase history' }, { status: 500 });
  }
}