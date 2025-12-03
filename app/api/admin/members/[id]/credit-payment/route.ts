import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/connection';
import { Members, MemberActivities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CreditRepository } from '@/db/repositories/CreditRepository';
import { MemberRepository } from '@/db/repositories/MemberRepository';
import { GetCurrentSession } from '@/lib/auth';
// Add imports
import { AuditRepository } from '@/db/repositories/AuditRepository';



// Reuse authorization helper from users route

async function handleAuthorization(allowedRoles: string[]): Promise<{ user?: { UserId: number; RoleName: string; }; error?: NextResponse; }> {
  const session = await GetCurrentSession();
  if (!session?.UserId || !session.RoleName) {
    if (session && 'error' in session) console.error('Session verification failed:', session.error);
    return { error: NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }) };
  }

  const userRole = session.RoleName.toLowerCase();
  const lowercasedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
  if (!lowercasedAllowedRoles.includes(userRole)) {
    return { error: NextResponse.json({ success: false, message: 'Forbidden: Insufficient permissions' }, { status: 403 }) };
  }

  return { user: { UserId: parseInt(session.UserId, 10), RoleName: session.RoleName } };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await handleAuthorization(['administrator', 'manager']);
    if (authResult.error) return authResult.error;
    const user = authResult.user!;

    const { id } = await params;
    const rawId = id; // this should be memberId string
    const memberId = parseInt(rawId, 10);
    if (isNaN(memberId)) return NextResponse.json({ success: false, message: 'Invalid member id' }, { status: 400 });

    const body = await request.json();
    const amount = parseFloat(body.amount);
    const full = !!body.full;

    if (isNaN(amount) && !full) return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });

    const result = await CreditRepository.processPayment(memberId, amount, { full });

    if (!result || !result.success) {
      return NextResponse.json({ success: false, message: result?.message || 'Failed to apply payment' }, { status: 500 });
    }

    // Synchronize the credit balance to ensure consistency
    const synchronizedBalance = await MemberRepository.synchronizeCreditBalance(memberId);

    // After successful payment:
    await AuditRepository.logAction({

      userId: user.UserId,
      action: 'CREDIT_PAYMENT_PROCESSED',
      entityType: 'Member',
      entityId: memberId,
      details: JSON.stringify({
        amount: result.applied,
        newBalance: result.newBalance,
        appliedPayments: result.appliedPayments
      })
    });

    // Log member activity for the Activity Log
    await db.insert(MemberActivities).values({
      MemberId: memberId,
      Action: 'made a credit payment',
      Amount: result.applied.toString(),
      Timestamp: new Date(),
      Description: `Credit payment of ₱${result.applied.toFixed(2)} processed by admin`
    });




    // Return receipt URL
    return NextResponse.json({
      success: true,
      amountApplied: result.applied,
      appliedPayments: result.appliedPayments,
      newBalance: result.newBalance,
      receiptUrl: `/api/admin/members/${memberId}/receipt/${Date.now()}`
    });


  } catch (error) {
    console.error('Admin credit payment error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
