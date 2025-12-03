import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '@/lib/auth';
import { db } from '@/db/connection';
import { Users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const session = await GetCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newEmail, password } = await request.json();

    // Validate input
    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'New email and password are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const userId = parseInt(session.UserId, 10);

    // Get current user
    const user = await db.query.Users.findFirst({
      where: eq(Users.UserId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is already taken
    const existingUser = await db.query.Users.findFirst({
      where: eq(Users.Email, newEmail),
    });

    if (existingUser && existingUser.UserId !== userId) {
      return NextResponse.json(
        { error: 'Email address is already in use' },
        { status: 400 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update email
    await db.update(Users)
      .set({
        Email: newEmail,
        UpdatedAt: new Date(),
      })
      .where(eq(Users.UserId, userId));

    return NextResponse.json({ message: 'Email changed successfully' });

  } catch (error) {
    console.error('Error changing email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
