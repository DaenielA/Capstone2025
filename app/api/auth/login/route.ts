import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthenticateUser, GetCurrentSession, SetSessionCookie } from '@/lib/auth';

// Validation schema for login requests
const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * GET handler for login status check
 */
export async function GET(request: NextRequest) {
  try {
    const session = await GetCurrentSession();
    if (session) {
      return NextResponse.json({
        success: true,
        message: "User is logged in",
        user: {
          UserId: session.UserId,
          RoleName: session.RoleName,
        }
      }, { status: 200 });
    } else {
      return NextResponse.json({
        success: false,
        message: "User is not logged in"
      }, { status: 200 });
    }
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred"
    }, { status: 500 });
  }
}

/**
 * POST handler for login requests
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = LoginSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => err.message).join(', ');

      return NextResponse.json({
        success: false,
        message: errorMessages
      }, { status: 400 });
    }

    const { email, password } = validationResult.data;

    // Authenticate user
    const authResult = await AuthenticateUser(email, password);

    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        message: authResult.message || "Authentication failed"
      }, { status: 401 });
    }

    // Set session cookie if token exists
    if (authResult.token) {
      await SetSessionCookie(authResult.token);
    }

    // Return success response with user info (excluding token)
    const { token, ...responseData } = authResult;

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    const message = `An unexpected error occurred`;

    return NextResponse.json({
      success: false,
      message: message
    }, { status: 500 });
  }
}
