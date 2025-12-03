import { NextRequest, NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';
import { eq } from 'drizzle-orm';
import { GetCurrentSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await GetCurrentSession();
    if (!session?.UserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Map UserId -> MemberId
    const userId = parseInt(session.UserId, 10);
    // Look up member record
    const { db } = await import('@/db/connection');
    const { Members } = await import('@/db/schema');
    const memberRecord = await db.query.Members.findFirst({ where: eq(Members.UserId, userId), columns: { MemberId: true } });
    if (!memberRecord) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      );
    }
    const memberId = memberRecord.MemberId;

    // Parse request body
    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      );
    }

    // Process the payment request
    const result = await CreditRepository.processPayment(memberId, amount);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Payment of ${result.applied} applied successfully.`,
        data: result,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing payment request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
