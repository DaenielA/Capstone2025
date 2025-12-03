import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '@/lib/auth';
import { db } from '@/db/connection';
import { Messages, Members } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';


export async function GET(request: NextRequest) {
  try {
    const session = await GetCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID required' }, { status: 400 });
    }

    // Check if user is admin or the member themselves
    const userRole = session.RoleName;
    if (userRole !== 'admin' && session.UserId !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await db
      .select()
      .from(Messages)
      .where(eq(Messages.ReceiverId, parseInt(memberId)))
      .orderBy(desc(Messages.SentAt));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await GetCurrentSession();
    if (!session || session.RoleName !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, subject, content, sendEmail: shouldSendEmail } = await request.json();

    if (!receiverId || !subject || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert message
    const [message] = await db
      .insert(Messages)
      .values({
        SenderId: parseInt(session.UserId),
        ReceiverId: parseInt(receiverId),
        Subject: subject,
        Content: content,
      })
      .returning();

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
