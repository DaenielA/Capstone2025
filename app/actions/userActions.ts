'use server'

import { db } from '@/db/connection';
import { Users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { GetCurrentSession } from '@/lib/auth';

// User Profile Interface
export interface UserProfileData {
  userId: number;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

// Get current user data (for Admin/Cashier)
export async function getCurrentUserData(): Promise<UserProfileData | null> {
  try {
    const session = await GetCurrentSession();
    if (!session || !session.UserId) {
      console.error("No active session found for user profile.");
      return null;
    }

    const userWithRole = await db.query.Users.findFirst({
      where: eq(Users.UserId, parseInt(session.UserId, 10)),
      with: {
        Role: true,
      },
    });

    if (!userWithRole) {
      console.error(`No user found with ID: ${session.UserId}`);
      return null;
    }

    const roleName = userWithRole.Role?.Name ?? 'user';

    return {
      userId: userWithRole.UserId,
      name: userWithRole.Name,
      email: userWithRole.Email,
      role: roleName,
      createdAt: userWithRole.CreatedAt,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}