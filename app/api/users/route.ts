import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRepository } from '@/db/repositories/UserRepository';
import { GetCurrentSession } from '@/lib/auth';

// Schema for creating a user
const CreateUserSchema = z.object({
  Name: z.string().min(1, "Name is required"),
  Email: z.string().email("Invalid email address").transform(email => email.trim().toLowerCase()),
  Password: z.string().min(6, "Password must be at least 6 characters"),
  RoleId: z.number().int().positive("Role ID must be a positive integer"),
  // Optional fields for member creation
  Phone: z.string().optional(),
  Address: z.string().optional(),
  InitialCredit: z.number().nonnegative().optional(),
  CreditLimit: z.number().nonnegative().optional(),
});

// Schema for querying users
const GetUsersQuerySchema = z.object({
  roleId: z.coerce.number().optional().catch(undefined),
  role: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1).catch(1),
  limit: z.coerce.number().min(1).max(100).default(50).catch(50),
});

async function handleAuthorization(allowedRoles: string[]): Promise<{ user?: { UserId: number; RoleName: string; }; error?: NextResponse; }> {
  const session = await GetCurrentSession();
  // 1. Check for a valid session
  if (!session?.UserId || !session.RoleName) {
    // The session object might be null or have an error property if GetCurrentSession fails
    if (session && 'error' in session) {
      console.error('Session verification failed:', session.error);
    }
    return { error: NextResponse.json({ success: false, message: 'Unauthorized: No active session' }, { status: 401 }) };
  }

  // 2. Check if the user's role is in the allowed list (case-insensitive)
  const userRole = session.RoleName.toLowerCase();
  const lowercasedAllowedRoles = allowedRoles.map(role => role.toLowerCase());
  if (!userRole || !lowercasedAllowedRoles.includes(userRole)) {
    console.log(`Authorization failed: User role "${session.RoleName}" is not in the allowed list [${allowedRoles.join(', ')}]`);
    return { error: NextResponse.json({ success: false, message: 'Forbidden: Insufficient permissions' }, { status: 403 }) };
  }

  // 3. On success, return user identifiers from the session. No database call needed.
  console.log(`Authorization successful for user ID: ${session.UserId} (Role: ${session.RoleName})`);
  return { user: { UserId: parseInt(session.UserId, 10), RoleName: session.RoleName } };
}


/**
 * GET /api/users - Get all users (with filtering and pagination)
 * GET handler for retrieving users with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/users - Received request");
    
    const authResult = await handleAuthorization(['administrator', 'manager']);
    if (authResult.error) {
      return authResult.error;
    }
    // const { user } = authResult; // user object with UserId and RoleName is available if needed

    // 3. Process request parameters
    const { searchParams } = new URL(request.url);
    const queryParams = GetUsersQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!queryParams.success) {
      return NextResponse.json({
        success: false,
        message: "Invalid query parameters",
        errors: queryParams.error.errors
      }, { status: 400 });
    }

    const { page, limit, search, roleId, role } = queryParams.data;

    // 4. Fetch users from the repository
    const result = await UserRepository.GetUsers({
      page,
      limit,
      searchQuery: search,
      roleId,
      role,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || 'Failed to fetch users' }, { status: 500 });
    }

    // 5. Return successful response
    return NextResponse.json({
      success: true,
      users: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('GET /api/users - Unhandled error:', { errorMessage, error });
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred on the server.",
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * POST /api/users - Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/users - Received request");
    
    const authResult = await handleAuthorization(['administrator', 'manager']);
    if (authResult.error) {
      return authResult.error;
    }
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log("POST /api/users - Request body:", { ...body, Password: '[REDACTED]' });
    } catch (error) {
      console.log("POST /api/users - Invalid JSON:", error);
      return NextResponse.json({
        success: false,
        message: "Invalid JSON in request body"
      }, { status: 400 });
    }
    
    const validationResult = CreateUserSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorMessages = validationResult.error.errors.map(err => `${err.path}: ${err.message}`).join(', ');
      console.log("POST /api/users - Validation failed:", errorMessages);
      
      return NextResponse.json({
        success: false,
        message: "Validation failed",
        errors: errorMessages
      }, { status: 400 });
    }
    
    // Create user
    const result = await UserRepository.CreateUser(validationResult.data);
    
    if ("user" in result) {
      // Return success response with type guard to ensure user exists
      console.log(`POST /api/users - User created successfully: ${result.user.Email}`);
      return NextResponse.json({
        success: true,
        message: "User created successfully",
        user: {
          UserId: result.user.UserId,
          Name: result.user.Name,
          Email: result.user.Email,
          RoleId: result.user.RoleId,
          CreatedAt: result.user.CreatedAt,
        },
      }, { status: 201 });
    } else {
      console.log("POST /api/users - Create user failed:", result.message);
      return NextResponse.json({
        success: false,
        message: result.message,
      }, { status: 400 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('POST /api/users - Unhandled error:', { errorMessage, error });
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred on the server.",
      error: errorMessage
    }, { status: 500 });
  }
}