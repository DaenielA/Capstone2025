import { expect } from 'chai';
import { db } from '../db';
import { Credits, Members, Transactions, TransactionItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { CreditRepository } from '../db/repositories/CreditRepository';

describe('CreditRepository FIFO payment allocation', () => {
  it('should allocate payments to the oldest credit items first', async () => {
    // Create a member
    const memberInsert = await db.insert(Members).values({
      Name: 'FIFO Test Member',
      Email: 'fifo@example.com',
    }).returning();
    const memberId = memberInsert[0].MemberId;

    // Create 2 credit transactions with Spent credit rows
    const t1 = await db.insert(Transactions).values({
      UserId: 1,
      MemberId: memberId,
      TotalAmount: '100',
      PaymentMethod: 'credit',
    }).returning();
    const t2 = await db.insert(Transactions).values({
      UserId: 1,
      MemberId: memberId,
      TotalAmount: '200',
      PaymentMethod: 'credit',
    }).returning();

    // Insert Spent credit entries
    const c1 = await db.insert(Credits).values({
      MemberId: memberId,
      Amount: '100',
      PaidAmount: '0.00',
      Type: 'Spent',
      RelatedTransactionId: t1[0].TransactionId,
      Notes: 'Spent 1'
    }).returning();

    const c2 = await db.insert(Credits).values({
      MemberId: memberId,
      Amount: '200',
      PaidAmount: '0.00',
      Type: 'Spent',
      RelatedTransactionId: t2[0].TransactionId,
      Notes: 'Spent 2'
    }).returning();

    // Update the member's credit balance to 300
    await db.update(Members).set({ CreditBalance: '300.00' }).where(eq(Members.MemberId, memberId));

    // Process a payment of 150: Expect c1 to be fully paid, c2 partially paid with 50
    const res = await CreditRepository.processPayment(memberId, 150);
    expect(res.success).to.equal(true);
    expect(res.applied).to.equal(150);

    // Re-fetch credits
    const spentAfter = await db.select().from(Credits).where(and(eq(Credits.MemberId, memberId), eq(Credits.Type, 'Spent'))).orderBy(Credits.CreditId);
    const updatedC1 = spentAfter.find((s: any) => s.CreditId === c1[0].CreditId);
    const updatedC2 = spentAfter.find((s: any) => s.CreditId === c2[0].CreditId);

    expect(parseFloat(updatedC1!.PaidAmount)).to.equal(100);
    expect(updatedC1!.Status).to.equal('fully_paid');
    expect(parseFloat(updatedC2!.PaidAmount)).to.equal(50);
    expect(updatedC2!.Status).to.equal('partially_paid');

    // Check member balance updated
    const memberAfterArray = await db.select().from(Members).where(eq(Members.MemberId, memberId));
    const memberAfter = memberAfterArray.length > 0 ? memberAfterArray[0] : undefined;

    // Sanity checks - throw if something went wrong so TypeScript knows these are defined
    if (!updatedC1 || !updatedC2 || !memberAfter) throw new Error('Test setup failed to create credits/member');
    expect(parseFloat(memberAfter!.CreditBalance)).to.equal(150);
  });
});
