import { NextRequest, NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';
import { MemberRepository } from '@/db/repositories/MemberRepository';
import { GetCurrentSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { db } from '@/db/connection';
import { Members } from '@/db/schema';


export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await GetCurrentSession();
    if (!session?.UserId) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const allowedRoles = ['cashier','manager','administrator'];
    const roleName = (session.RoleName || '').toLowerCase();
    if (!allowedRoles.includes(roleName)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const rawId = params.id;
    const memberId = parseInt(rawId, 10);
    if (isNaN(memberId)) return NextResponse.json({ success: false, message: 'Invalid member id' }, { status: 400 });

    const body = await request.json();
    const amount = parseFloat(body.amount);
    const full = !!body.full;

    if (isNaN(amount) && !full) return NextResponse.json({ success: false, message: 'Invalid amount' }, { status: 400 });

    // Ensure member exists
    const memberExists = await db.select().from(Members).where(eq(Members.MemberId, memberId));
    if (!memberExists || memberExists.length === 0) return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 });

    const result = await CreditRepository.processPayment(memberId, amount, { full });

    if (!result || !result.success) return NextResponse.json({ success: false, message: result?.message || 'Failed to apply payment' }, { status: 500 });

    // Synchronize the credit balance to ensure consistency
    const synchronizedBalance = await MemberRepository.synchronizeCreditBalance(memberId);

    return NextResponse.json({ success: true, applied: result.applied, appliedPayments: result.appliedPayments, newBalance: result.newBalance });

  } catch (error: any) {
    console.error('POS credit payment error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
