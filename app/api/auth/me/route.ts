import { NextRequest, NextResponse } from 'next/server';
import { GetCurrentSession } from '@/lib/auth';

/**
 * GET handler to retrieve the current authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await GetCurrentSession();
    
    if (!session) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated"
      }, { status: 401 });
    }
    
    // Return the session user (excluding sensitive information)
    return NextResponse.json({
      success: true,
      user: session
    }, { status: 200 });
  } catch (error) {
    console.error('Get current user error:', error);
    
    return NextResponse.json({
      success: false,
      message: "An error occurred while retrieving user information"
    }, { status: 500 });
  }
} 