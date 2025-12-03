import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { VerificationTokens, Members, Users, Roles } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

/**
 * GET /api/auth/verify - Verify an account using a token
 */
export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/auth/verify - Received request");
    
    // Get token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      console.log("GET /api/auth/verify - No token provided");
      return NextResponse.json({
        success: false,
        message: "No verification token provided"
      }, { status: 400 });
    }
    
    console.log(`GET /api/auth/verify - Verifying token: ${token.substring(0, 8)}...`);
    
    // Find the token in the database
    const verificationToken = await db.query.VerificationTokens.findFirst({
      where: and(
        eq(VerificationTokens.Token, token),
        eq(VerificationTokens.Type, 'account-verification'),
        gt(VerificationTokens.ExpiresAt, new Date()) // Token must not be expired
      ),
    });
    
    if (!verificationToken) {
      console.log("GET /api/auth/verify - Invalid or expired token");
      return NextResponse.json({
        success: false,
        message: "Invalid or expired verification token"
      }, { status: 400 });
    }
    
    // Check if token has already been used
    if (verificationToken.UsedAt) {
      console.log("GET /api/auth/verify - Token already used");
      return NextResponse.json({
        success: false,
        message: "This verification link has already been used"
      }, { status: 400 });
    }
    
    // Get the member associated with the token
    const member = await db.query.Members.findFirst({
      where: eq(Members.MemberId, verificationToken.MemberId!),
    });
    
    if (!member) {
      console.log("GET /api/auth/verify - Member not found for token");
      return NextResponse.json({
        success: false,
        message: "Member account not found"
      }, { status: 404 });
    }
    
    // Check if member already has a user account
    if (member.UserId) {
      console.log("GET /api/auth/verify - Member already has an account");
      return NextResponse.json({
        success: false,
        message: "This member already has an account"
      }, { status: 400 });
    }

    // Redirect to the account setup page with the token
    // This allows the user to set their password and complete registration
    const setupUrl = `/account-setup?token=${token}`;
    
    return NextResponse.redirect(new URL(setupUrl, request.url));
  } catch (error) {
    console.error('GET /api/auth/verify - Unhandled error:', error);
    
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred while processing your request",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/auth/verify - Complete account setup with password
 */
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/auth/verify - Received request");
    
    // Parse request body
    const body = await request.json();
    const { token, password } = body;
    
    if (!token || !password) {
      console.log("POST /api/auth/verify - Missing required fields");
      return NextResponse.json({
        success: false,
        message: "Token and password are required"
      }, { status: 400 });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({
        success: false,
        message: "Password must be at least 8 characters long"
      }, { status: 400 });
    }
    
    // Find the token in the database
    const verificationToken = await db.query.VerificationTokens.findFirst({
      where: and(
        eq(VerificationTokens.Token, token),
        eq(VerificationTokens.Type, 'account-verification'),
        gt(VerificationTokens.ExpiresAt, new Date()) // Token must not be expired
      ),
    });
    
    if (!verificationToken) {
      console.log("POST /api/auth/verify - Invalid or expired token");
      return NextResponse.json({
        success: false,
        message: "Invalid or expired verification token"
      }, { status: 400 });
    }
    
    // Check if token has already been used
    if (verificationToken.UsedAt) {
      console.log("POST /api/auth/verify - Token already used");
      return NextResponse.json({
        success: false,
        message: "This verification link has already been used"
      }, { status: 400 });
    }
    
    // Get the member associated with the token
    const member = await db.query.Members.findFirst({
      where: eq(Members.MemberId, verificationToken.MemberId!),
    });
    
    if (!member) {
      console.log("POST /api/auth/verify - Member not found for token");
      return NextResponse.json({
        success: false,
        message: "Member account not found"
      }, { status: 404 });
    }
    
    // Check if member already has a user account
    if (member.UserId) {
      console.log("POST /api/auth/verify - Member already has an account");
      return NextResponse.json({
        success: false,
        message: "This member already has an account"
      }, { status: 400 });
    }
    
    // Start a transaction to create user account and update member
    return await db.transaction(async (tx) => {
      try {
        // Find the Member role
        const memberRole = await tx.query.Roles.findFirst({
          where: eq(Roles.Name, 'Member'),
        });
        
        if (!memberRole) {
          throw new Error("Member role not found");
        }
        
        // Hash the password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create user account
        const newUser = await tx
          .insert(Users)
          .values({
            Name: member.Name,
            Email: member.Email,
            PasswordHash: passwordHash,
            RoleId: memberRole.RoleId,
          })
          .returning();
        
        const user = newUser[0];
        
        // Update member with user ID
        await tx
          .update(Members)
          .set({
            UserId: user.UserId,
          })
          .where(eq(Members.MemberId, member.MemberId));
        
        // Mark token as used
        await tx
          .update(VerificationTokens)
          .set({
            UsedAt: new Date(),
            UserId: user.UserId,
          })
          .where(eq(VerificationTokens.TokenId, verificationToken.TokenId));
        
        console.log(`POST /api/auth/verify - Account created successfully for member ${member.MemberId}`);
        
        // Send welcome email
        setTimeout(async () => {
          try {
            const { EmailService } = await import('@/lib/email');
            await EmailService.SendWelcomeEmail(
              member.Email,
              member.Name,
              'Member'
            );
          } catch (emailError) {
            console.error("Error sending welcome email:", emailError);
          }
        }, 0);
        
        return NextResponse.json({
          success: true,
          message: "Account created successfully",
          redirectUrl: "/login",
        }, { status: 201 });
      } catch (error) {
        console.error("Transaction error:", error);
        throw error;
      }
    });
  } catch (error) {
    console.error('POST /api/auth/verify - Unhandled error:', error);
    
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred while processing your request",
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 