import { NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';
import { MemberRepository } from '@/db/repositories/MemberRepository';
import { db } from '@/db'; // Assuming db is needed for querying members directly
import { SendCreditPenaltyImpendingNotification } from '@/lib/notifications'; // Import the new notification function

export async function GET(request: Request) {
  // In a real application, you would add authentication/authorization
  // to ensure this endpoint can only be triggered by your designated scheduler.
  // For example, checking a secret token in the request headers.
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Check for members nearing penalty and send notifications
    const membersNearingPenalty = await CreditRepository.getMembersNearingPenalty(5);
    for (const member of membersNearingPenalty) {
      console.log(`Sending impending penalty notification to Member ID: ${member.memberId}`);
      await SendCreditPenaltyImpendingNotification(
        member.memberId,
        member.memberName,
        member.memberEmail,
        member.creditAmount,
        5 // daysUntilPenalty is fixed at 5 for this notification trigger
      );
    }

    await CreditRepository.applyProductCreditPenalties();

    // Get all members to process their credit and late fees
    const members = await db.query.Members.findMany();

    for (const member of members) {
      console.log(`Processing penalties for Member ID: ${member.MemberId}`);
      // Process late fees for the member
      await CreditRepository.processLateFees(member.MemberId);
      
      // Optionally, apply interest if it should be automated
      // await CreditRepository.applyInterest(member.MemberId);

      // Synchronize the member's credit balance to reflect any applied penalties
      await MemberRepository.synchronizeCreditBalance(member.MemberId);
    }

    return NextResponse.json({ success: true, message: 'Penalty processing and impending notifications completed.' });
  } catch (error) {
    console.error('Error processing penalties:', error);
    return NextResponse.json({ success: false, message: 'Error processing penalties.', error: (error as Error).message }, { status: 500 });
  }
}
