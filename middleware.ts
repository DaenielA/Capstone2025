import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/admin',
  '/pos',
  '/members',
  '/member',
];

// Routes that should redirect to dashboard if already logged in
const AUTH_ROUTES = [
  '/login',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  let isAuthenticated = false;
  let userRole = '';
  
   // If the user is not authenticated and is trying to access a protected route,
  // redirect them to the login page.
  if (!authToken && request.nextUrl.pathname.startsWith('/members')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname) // Optional: redirect back after login
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
 

// Configure the middleware to run only on specific routes
export const config = {
  matcher: [
    '/admin/:path*',
    '/pos/:path*',
    '/member/:path*',
    '/members/:path*',
    '/login',
  ],
}; 