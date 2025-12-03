// app/api/members/[id]/running-balance/route.ts

import { NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';

interface Params {
  id: string;
}

export async function GET(request: Request, context: { params: Params }) {
  try {
    const memberId = parseInt(context.params.id, 10);

    if (isNaN(memberId)) {
      return NextResponse.json({ message: 'Invalid member ID' }, { status: 400 });
    }

    const runningBalance = await CreditRepository.getRunningBalance(memberId);

    // The repository can return a negative number if payments exceed debits.
    // Let's ensure we send back a valid number.
    if (runningBalance === null || runningBalance === undefined || isNaN(runningBalance)) {
        return NextResponse.json({ message: 'Could not calculate running balance.' }, { status: 404 });
    }

    return NextResponse.json({ runningBalance });

  } catch (error) {
    console.error(`Error fetching running balance for member ${context.params.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ message: 'Failed to fetch running balance', error: errorMessage }, { status: 500 });
  }
}