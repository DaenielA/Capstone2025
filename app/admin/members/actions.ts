'use server';

import { db } from '@/db/connection';
import { Members, Users, Roles, MemberActivities, Transactions } from '@/db/schema';
import { eq, lte, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { EmailService } from '@/lib/email';
import { MemberRepository } from '@/db/repositories';

/**
 * Get all members for admin view.
 */
export async function GetAllMembersForAdmin() {
  return MemberRepository.GetAll();
}

/**
 * Get a member by ID for admin view.
 */
export async function GetMemberByIdForAdmin(memberId: number) {
  // Note: MemberRepository.GetById returns a slightly different shape.
  // You might need to adjust where this is called or adjust the repository method.
  return MemberRepository.GetById(memberId);
}

/**
 * Get a member by email for admin view.
 */
export async function GetMemberByEmailForAdmin(email: string) {
  return MemberRepository.GetByEmail(email);
}

export async function AddMember(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  userId?: number | null;
  initialCredit: number;
  creditLimit: number;
}): Promise<{ success: boolean; message?: string }> {
  try {
    await db.insert(Members).values({
      Name: data.name,
      Email: data.email,
      Phone: data.phone,
      Address: data.address,
      UserId: data.userId,
      CreditBalance: data.initialCredit.toString(),
      CreditLimit: data.creditLimit.toString(),
      Status: 'active', // Default status
    });
    revalidatePath('/admin/members');
    return { success: true };
  } catch (error: any) {
    console.error("Error adding member:", error);
    return { success: false, message: error.message || "Database error." };
  }
}

export async function UpdateMember(memberId: number, data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  userId?: number | null;
  creditBalance: number;
  creditLimit: number;
}): Promise<{ success: boolean; message?: string }> {
  try {
    await db.update(Members)
      .set({
        Name: data.name,
        Email: data.email,
        Phone: data.phone,
        Address: data.address,
        UserId: data.userId,
        CreditBalance: data.creditBalance.toString(),
        CreditLimit: data.creditLimit.toString(),
      })
      .where(eq(Members.MemberId, memberId));
    revalidatePath('/admin/members');
    revalidatePath(`/api/members/${memberId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating member:", error);
    return { success: false, message: error.message || "Database error." };
  }
}

export async function DeleteMember(memberId: number): Promise<{ success: boolean; message?: string }> {
  try {
    await db.delete(Members).where(eq(Members.MemberId, memberId));
    revalidatePath('/admin/members');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting member:", error);
    return { success: false, message: error.message || "Database error." };
  }
}

export async function IssueAccountVerification(memberId: number): Promise<{ success: boolean; message: string }> {

  try {
    const member = await db.query.Members.findFirst({
      where: eq(Members.MemberId, memberId),
    });

    if (!member) {
      return { success: false, message: "Member not found." };
    }
    if (member.UserId) {
      return { success: false, message: "Member already has a linked user account." };
    }

    // This would typically generate a unique, expiring token and save it.
    // For now, we'll just send an email with a link.
    const verificationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/register?email=${encodeURIComponent(member.Email)}&name=${encodeURIComponent(member.Name)}`;

    await EmailService.SendAccountVerificationEmail(member.Email, member.Name, verificationLink);

    return { success: true, message: `Verification email sent to ${member.Email}.` };
  } catch (error: any) {
    console.error("Error issuing account verification:", error);
    return { success: false, message: error.message || "Failed to send verification email." };
  }
}
