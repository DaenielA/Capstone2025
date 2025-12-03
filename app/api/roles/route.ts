import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { Roles } from '@/db/schema';

/**
 * GET handler for retrieving all roles
 */
export async function GET(request: Request) {
  try {
    // Fetch all roles from the database
    const roles = await db.select({
      id: Roles.RoleId,
      name: Roles.Name,
      description: Roles.Description,
    })
    .from(Roles)
    .orderBy(Roles.Name);
    
    return NextResponse.json({
      status: 'success',
      data: roles
    });
  } catch (error: any) {
    console.error('Error fetching roles:', error);
    
    return NextResponse.json({
      status: 'error',
      message: `Error fetching roles: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 