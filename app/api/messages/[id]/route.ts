import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '@/lib/auth';
import { db } from '@/db/connection';
import { Messages } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await GetCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = parseInt(params.id);

    // Get the message
    const message = await db
      .select()
      .from(Messages)
      .where(eq(Messages.MessageId, messageId))
      .limit(1);

    if (!message[0]) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user can mark as read (must be the receiver)
    if (message[0].ReceiverId !== parseInt(session.UserId)) {
      return NextResponse.json({ error: 'Cannot modify this message' }, { status: 403 });
    }

    // Mark as read
    await db
      .update(Messages)
      .set({ IsRead: true })
      .where(eq(Messages.MessageId, messageId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
