import { cookies } from "next/headers";
import { db } from '@/db';
import { Users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import * as jose from 'jose';

// The secret key must be of a minimum length for the HS256 algorithm.
// Using a longer, more secure default for development is crucial.
// In production, this MUST be set via an environment variable.
const secretString = process.env.JWT_SECRET;

if (!secretString) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is not set in production. Please add it to your .env file.');
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set. Using a default, insecure secret for development. Please set it in your .env.local file.');
  }
}

const JWT_SECRET = new TextEncoder().encode(secretString ?? 'a-secure-secret-key-for-development-that-is-long-enough');

export type AuthResult = { success: true; user: any; token: string } | { success: false; message: string; };

export async function GetCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    // Assuming the payload contains the user ID and other necessary info
    return {
      // The 'sub' (subject) claim is the user ID, which is a string in the token.
      UserId: payload.sub!, 
      // We include the role name directly in the session for efficient authorization checks.
      // The '!' asserts that RoleName will be present for any valid session token.
      RoleName: payload.RoleName as string,
      ...payload
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export async function ClearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
    sameSite: "lax",
  });
  // Also clear the old sessionToken if it exists
  if (cookieStore.has("sessionToken")) {
    cookieStore.set("sessionToken", "", { expires: new Date(0) });
  }
}

export async function SetSessionCookie(token: string) {
  const cookieStore = await cookies();
  // This function now sets the auth_token (JWT)
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
    sameSite: 'lax',
  });
}

export async function AuthenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.query.Users.findFirst({
      where: eq(Users.Email, normalizedEmail),
      with: { Role: true },
    });

    if (!user) {
      console.log(`Authentication attempt failed: User not found for email "${normalizedEmail}".`);
      return { success: false, message: "Invalid email or password." };
    }

    // Add a robust check to ensure the user has a valid password hash string.
    if (typeof user.PasswordHash !== 'string' || !user.PasswordHash) {
      console.error(`Authentication failed: User "${normalizedEmail}" (ID: ${user.UserId}) has no password hash.`);
      return { success: false, message: "Account is not configured for password login. Please contact an administrator." };
    }

    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!passwordMatch) {
      console.log(`Authentication attempt failed: Invalid password for user "${normalizedEmail}" (ID: ${user.UserId}).`);
      return { success: false, message: "Invalid email or password." };
    }

    // Add a check to ensure the user's account is active.
    if (!user.IsActive) {
      console.log(`Authentication attempt failed: Account for "${normalizedEmail}" (ID: ${user.UserId}) is inactive.`);
      return { success: false, message: "Your account is inactive. Please contact an administrator." };
    }

    // Add a check to ensure the user has a role.
    if (!user.Role || !user.Role.Name) {
      return { success: false, message: "User account is not configured with a role. Please contact an administrator." };
    }

    // Create JWT
    const token = await new jose.SignJWT({ RoleName: user.Role.Name, email: user.Email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.UserId))
      .setIssuedAt()
      .setExpirationTime('1w')
      .sign(JWT_SECRET); // The secret must be a Uint8Array for HS256

    // Exclude password hash from the returned user object
    const { PasswordHash, Role, ...userWithoutPassword } = user;

    // Flatten the user object to include RoleName at the top level for client-side convenience
    const userForClient = {
      ...userWithoutPassword,
      UserId: String(user.UserId), // Ensure UserId is a string, consistent with the session
      RoleName: Role.Name,
    };

    return { success: true, user: userForClient, token: token };

  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, message: "An unexpected error occurred during authentication." };
  }
}
