import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '@/lib/auth';
import { db } from '@/db/connection';
import { Users, Members, AuditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const session = await GetCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.UserId, 10);

    // Get current user with password hash
    const user = await db.query.Users.findFirst({
      where: eq(Users.UserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.PasswordHash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.update(Users)
      .set({
        PasswordHash: hashedNewPassword,
        UpdatedAt: new Date(),
      })
      .where(eq(Users.UserId, userId));

    // Log the password change in audit logs
    await db.insert(AuditLogs).values({
      UserId: userId,
      Action: 'PASSWORD_CHANGED',
      EntityType: 'USER',
      EntityId: userId,
      Details: 'User changed their password',
      Timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
