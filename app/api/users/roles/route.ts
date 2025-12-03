import { db } from '@/db'
import { Roles } from '@/db/schema'
import { NextResponse } from 'next/server'
import { GetCurrentSession } from '@/lib/auth'

/**
 * GET handler for retrieving all user roles
 */
export async function GET() {
  try {
    // 1. Get the current user's session
    const session = await GetCurrentSession()

    // 2. Check if the user is authenticated
    if (!session || !session.UserId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 3. Check if the user has an 'Administrator' or 'Manager' role
    const userRole = session.RoleName || ''
    if (!['Administrator', 'Manager'].includes(userRole)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      )
    }

    // 4. Fetch roles from the database
    const allRoles = await db.select().from(Roles)
    return NextResponse.json({ success: true, roles: allRoles })
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { success: false, message: 'An internal server error occurred' },
      { status: 500 }
    )
  }
}