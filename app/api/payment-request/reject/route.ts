import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '../../../../lib/auth';
import { PaymentRequestRepository } from '../../../../db/repositories/PaymentRequestRepository';

export async function POST(request: NextRequest) {
  try {
    const session = await GetCurrentSession();
    if (!session?.UserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentRequestId, rejectionNotes } = body;

    if (!paymentRequestId || typeof paymentRequestId !== 'number') {
      return NextResponse.json(
        { error: 'Valid paymentRequestId is required' },
        { status: 400 }
      );
    }

    // Only admins can reject payment requests
    // TODO: Add role check here

    const result = await PaymentRequestRepository.reject(
      paymentRequestId,
      parseInt(session.UserId),
      rejectionNotes
    );

    return NextResponse.json({
      success: true,
      message: 'Payment request rejected successfully',
      paymentRequest: result
    });

  } catch (error) {
    console.error('Error rejecting payment request:', error);
    return NextResponse.json(
      { error: 'Failed to reject payment request' },
      { status: 500 }
    );
  }
}
