import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '../../../../../lib/auth';
import { PaymentRequestRepository } from '../../../../../db/repositories/PaymentRequestRepository';

interface RouteParams {
  params: {
    paymentId: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await GetCurrentSession();
    if (!session?.UserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentId = parseInt(params.paymentId);
    if (isNaN(paymentId)) {
      return NextResponse.json(
        { error: 'Invalid payment ID' },
        { status: 400 }
      );
    }

    const allocations = await PaymentRequestRepository.getAllocations(paymentId);

    return NextResponse.json({
      success: true,
      allocations
    });

  } catch (error) {
    console.error('Error getting payment allocations:', error);
    return NextResponse.json(
      { error: 'Failed to get payment allocations' },
      { status: 500 }
    );
  }
}
