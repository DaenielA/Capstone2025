import { NextResponse } from 'next/server';
import { db } from '@/db';
import { Credits } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const memberId = parseInt(params.id, 10);

  if (isNaN(memberId)) {
    return NextResponse.json({ message: 'Invalid member ID' }, { status: 400 });
  }

  try {
    const memberCredits = await db
      .select()
      .from(Credits)
      .where(eq(Credits.MemberId, memberId))
      .orderBy(desc(Credits.Timestamp));

    return NextResponse.json({ credits: memberCredits });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    return NextResponse.json({ message: 'Failed to fetch credit history' }, { status: 500 });
  }
}
