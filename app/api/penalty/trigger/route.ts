import { NextResponse } from 'next/server';
import { CreditRepository } from '../../../../db/repositories/CreditRepository';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const creditId = body?.creditId;
    const now = body?.now; // optional ISO string
    const force = !!body?.force;

    if (!creditId) {
      return NextResponse.json({ success: false, error: 'creditId_required' }, { status: 400 });
    }

    const result = await CreditRepository.applyPenaltyToCredit(Number(creditId), { now, force });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('Error in penalty trigger API:', err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
