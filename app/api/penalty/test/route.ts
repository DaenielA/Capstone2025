import { NextRequest, NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';
import { MemberRepository } from '@/db/repositories/MemberRepository';
import { db } from '@/db'; // Assuming db is needed for querying members directly

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testDate, memberId } = body;

    // Use provided test date or current date
    const now = testDate ? new Date(testDate) : new Date();

    console.log(`Testing penalty application with date: ${now.toISOString()}`);

    // Apply penalties using the test date
    await CreditRepository.applyProductCreditPenaltiesWithDate(now);

    // If specific member provided, sync their balance
    if (memberId) {
      await MemberRepository.synchronizeCreditBalance(memberId);
    } else {
      // Sync all members' balances
      const members = await db.query.Members.findMany();
      for (const member of members) {
        await MemberRepository.synchronizeCreditBalance(member.MemberId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Penalty test completed using date: ${now.toISOString()}`,
      testDate: now.toISOString()
    });

  } catch (error) {
    console.error('Error in penalty test:', error);
    return NextResponse.json({
      success: false,
      message: 'Error testing penalties',
      error: (error as Error).message
    }, { status: 500 });
  }
}
