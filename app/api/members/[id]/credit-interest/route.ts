import { NextRequest, NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';

/**
 * GET handler for calculating interest for a member
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

    const interestAmount = await CreditRepository.calculateInterest(memberId);

    return NextResponse.json({
      success: true,
      interestAmount,
      message: `Calculated interest: ₱${interestAmount.toFixed(2)}`
    });

  } catch (error: any) {
    console.error(`Error calculating interest for member:`, error);

    return NextResponse.json({
      success: false,
      message: `Error calculating interest: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * POST handler for applying interest to a member's account
 */
export async function POST(
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

    const appliedInterest = await CreditRepository.applyInterest(memberId);

    return NextResponse.json({
      success: true,
      appliedInterest,
      message: `Applied interest: ₱${appliedInterest.toFixed(2)}`
    });

  } catch (error: any) {
    console.error(`Error applying interest for member:`, error);

    return NextResponse.json({
      success: false,
      message: `Error applying interest: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
