import { NextResponse } from 'next/server';
import { db } from '@/db';
import { Members, Users, Roles, MemberActivities, Transactions } from '@/db/schema';
import { eq, and, desc, gt, sql, asc } from 'drizzle-orm';
import { CreditRepository } from '@/db/repositories/CreditRepository';

export interface CreditItem {
    transactionId: number;
    transactionDate: string;
    productName: string;
    quantity: number;
    priceAtTimeOfSale: number;
    total: number;
}

// Define the structure of a member object for the admin page
export interface MemberForAdminPage {
  id: number;
  memberID: string;
  universalId: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  joinDate: string;
  currentCredit: number;
  creditLimit: number;
  userId: number | null;
  roleName: string | null;
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const withCredit = searchParams.get('withCredit');
  const hasCredit = searchParams.get('hasCredit');
  const searchQuery = searchParams.get('search') || '';
  const statusFilter = searchParams.get('statusFilter') || 'all';

  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = searchParams.get('sortOrder') || 'asc';
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  try {
    let whereConditions = [];

    if (withCredit === 'true') {
      whereConditions.push(eq(Members.Status, 'active'), eq(Roles.Name, 'Member'));
    } else if (hasCredit === 'true') {
      // We'll filter by actual credit balance after calculation
    }

    if (statusFilter !== 'all') {
      whereConditions.push(eq(Members.Status, statusFilter));
    }

if (searchQuery) {
  whereConditions.push(sql`${Members.Name} ILIKE ${`%${searchQuery}%`} OR ${Members.Email} ILIKE ${`%${searchQuery}%`} OR ${Members.MemberId}::text ILIKE ${`%${searchQuery}%`} OR COALESCE(${Members.UserId}, ${Members.MemberId})::text ILIKE ${`%${searchQuery}%`}`);
}



    const orderBy = sortOrder === 'desc' ? desc : asc;
    let orderColumn;
    switch (sortBy) {
      case 'name':
        orderColumn = Members.Name;
        break;
      case 'id':
        orderColumn = Members.MemberId;
        break;
      case 'credit':
        // We'll sort by calculated credit balance
        orderColumn = Members.CreditBalance;
        break;
      case 'date':
        orderColumn = Members.CreatedAt;
        break;
      default:
        orderColumn = Members.Name;
    }

    const offset = (page - 1) * pageSize;

    // First get the basic member data
    const [basicMembers, totalCountResult] = await Promise.all([
      db
        .select({
          id: Members.MemberId,
          memberID: Members.MemberId,
          universalId: sql<number>`COALESCE(${Members.UserId}, ${Members.MemberId})`,
          name: Members.Name,
          email: Members.Email,
          phone: Members.Phone,
          address: Members.Address,
          status: Members.Status,
          joinDate: Members.CreatedAt,
          storedCreditBalance: Members.CreditBalance,
          creditLimit: Members.CreditLimit,
          userId: Members.UserId,
          roleName: Roles.Name,
        })

        .from(Members)
        .leftJoin(Users, eq(Members.UserId, Users.UserId))
        .leftJoin(Roles, eq(Users.RoleId, Roles.RoleId))
        .where(and(...whereConditions))
        .orderBy(orderBy(orderColumn))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(Members)
        .leftJoin(Users, eq(Members.UserId, Users.UserId))
        .leftJoin(Roles, eq(Users.RoleId, Roles.RoleId))
        .where(and(...whereConditions))
    ]);

    const totalCount = totalCountResult[0].count;

    // Calculate actual running balance for each member
    const membersWithCalculatedBalance = await Promise.all(
      basicMembers.map(async (member) => {
        try {
          const runningBalance = await CreditRepository.getRunningBalance(member.id);
          return {
            ...member,
            currentCredit: runningBalance,
          };
        } catch (error) {
          console.error(`Error calculating balance for member ${member.id}:`, error);
          // Fallback to stored balance if calculation fails
          return {
            ...member,
            currentCredit: parseFloat(member.storedCreditBalance),
          };
        }
      })
    );

    // Apply hasCredit filter if needed
    let filteredMembers = membersWithCalculatedBalance;
    if (hasCredit === 'true') {
      filteredMembers = membersWithCalculatedBalance.filter(member => member.currentCredit > 0);
    }

    // Remove the storedCreditBalance field from the response
    const members = filteredMembers.map(({ storedCreditBalance, ...member }) => member);

    return NextResponse.json({
      success: true,
      members,
      pagination: {
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Explicitly pick fields for the Members table to avoid relational data issues.
    const memberData = {
      Name: body.Name,
      Email: body.Email,
      Phone: body.Phone,
      Address: body.Address,
      CreditLimit: body.CreditLimit,
      InterestRate: body.InterestRate,
      GracePeriodDays: body.GracePeriodDays,
      MinimumPaymentPercentage: body.MinimumPaymentPercentage,
      Status: body.Status,
      UserId: body.UserId,
    };

    const newMember = await db.insert(Members).values(memberData).returning();

    return NextResponse.json(newMember[0], { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    // Provide a more specific error message in the response if possible
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to create member', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...dataToUpdate } = body;
    // Assuming body contains member id and data to update
    const updatedMember = await db.update(Members).set(dataToUpdate).where(eq(Members.MemberId, id)).returning();
    if (updatedMember.length === 0) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return NextResponse.json(updatedMember[0]);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Failed to update member' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await db.delete(Members).where(eq(Members.MemberId, id));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}
