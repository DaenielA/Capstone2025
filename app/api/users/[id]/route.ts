import { NextResponse } from 'next/server';
import { UserRepository } from '@/db/repositories/UserRepository';
import { GetCurrentSession } from '@/lib/auth';

/**
 * GET /api/users/[id]
 * Retrieves a single user by their ID.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { params } = await arguments[1];
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const session = await GetCurrentSession();
    if (!session || (session.RoleName !== 'Administrator' && session.RoleName !== 'Manager')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const result = await UserRepository.GetUserById(id);

    if (!result.success || !result.user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // We need to get the role name for the user
    const userWithRole = await UserRepository.GetUsers({ userId: id });

    if (!userWithRole.success || !userWithRole.users || userWithRole.users.length === 0) {
      return NextResponse.json({ success: false, message: 'User role not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: userWithRole.users[0] });
  } catch (error) {
    console.error(`Error in GET /api/users/[id]:`, error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id]
 * Updates a user's information.
 */
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { params } = await arguments[1];
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const session = await GetCurrentSession();
    if (!session || (session.RoleName !== 'Administrator' && session.RoleName !== 'Manager')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { Name, Email, RoleId } = body;

    const result = await UserRepository.UpdateUser(id, {
      Name,
      Email,
      RoleId,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message || 'Failed to update user' }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error(`Error in PUT /api/users/[id]:`, error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Deactivates a user (soft delete).
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { params } = await arguments[1];
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const session = await GetCurrentSession();
    if (!session || (session.RoleName !== 'Administrator' && session.RoleName !== 'Manager')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (parseInt(session.UserId, 10) === id) {
      return NextResponse.json({ success: false, message: 'You cannot delete your own account.' }, { status: 403 });
    }

    // In a real app, you might soft delete (e.g., set an `IsActive` flag to false)
    // For now, we'll use the existing UpdateUser to change status if available, or just return success.
    // Assuming your DB schema has an `IsActive` flag on the Users table.
    // If not, this will just return success without doing anything.
    const result = await UserRepository.UpdateUser(id, { IsActive: false });

    if (!result.success) {
        return NextResponse.json({ success: false, message: result.message || 'Failed to deactivate user' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error(`Error in DELETE /api/users/[id]:`, error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * PATCH /api/users/[id]
 * Reactivates a user.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { params } = await arguments[1];
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
    }

    const session = await GetCurrentSession();
    if (!session || (session.RoleName !== 'Administrator' && session.RoleName !== 'Manager')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    // Assuming your DB schema has an `IsActive` flag on the Users table.
    const result = await UserRepository.UpdateUser(id, { IsActive: true });

    if (!result.success) {
        return NextResponse.json({ success: false, message: result.message || 'Failed to reactivate user' }, { status: 400 });
    }


    return NextResponse.json({ success: true, message: 'User reactivated successfully' });
  } catch (error) {
    console.error(`Error in PATCH /api/users/[id]:`, error);
    return NextResponse.json({ status: 'error', message: 'Internal Server Error' }, { status: 500 });
  }
}
/**
 * This is a placeholder to satisfy the `route.ts` convention.
 * We are using the new `[id]` route file convention.
 */
export async function OPTIONS() {
    return new Response(null, { status: 204 });
}