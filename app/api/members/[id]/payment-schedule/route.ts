import { NextRequest, NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';

/**
 * GET handler for retrieving payment schedule for a member
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

    const paymentSchedule = await CreditRepository.getPaymentSchedule(memberId);

    return NextResponse.json({
      success: true,
      paymentSchedule
    });

  } catch (error: any) {
    console.error(`Error retrieving payment schedule for member:`, error);

    return NextResponse.json({
      success: false,
      message: `Error retrieving payment schedule: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
