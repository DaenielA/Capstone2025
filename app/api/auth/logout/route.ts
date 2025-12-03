import { NextRequest, NextResponse } from 'next/server';
import { ClearSessionCookie } from '@/lib/auth';

/**
 * POST handler for logout
 */
export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    await ClearSessionCookie();
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Logged out successfully"
    }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json({
      success: false,
      message: "An error occurred during logout"
    }, { status: 500 });
  }
}

/**
 * GET handler for logout (useful for link-based logout)
 */
export async function GET(request: NextRequest) {
  try {
    // Clear the session cookie
    await ClearSessionCookie();
    
    // Get the redirect URL from query parameters or default to home
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/';
    
    // Redirect to the specified URL
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error('Logout error:', error);
    
    // If an error occurs, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }
} 