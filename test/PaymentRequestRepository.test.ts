import { expect } from 'chai';
import { PaymentRequestRepository } from '../db/repositories/PaymentRequestRepository';
import { db } from '../db';
import { Members, PaymentRequests, Credits, PaymentAllocations } from '../db/schema';

describe('PaymentRequestRepository', () => {
  it('should return allocations for a payment', async () => {
    // 1. Create a member
    const member = await db.insert(Members).values({
      Name: 'Test Member',
      Email: 'test@member.com',
    }).returning();

    // 2. Create a payment request
    const paymentRequest = await db.insert(PaymentRequests).values({
      MemberId: member[0].MemberId,
      Amount: '100',
      RequestedBy: 1, // Assuming a user with ID 1 exists
    }).returning();

    // 3. Create a credit
    const credit = await db.insert(Credits).values({
      MemberId: member[0].MemberId,
      Amount: '100',
      Type: 'Earned',
    }).returning();

    // 4. Create a payment allocation
    await db.insert(PaymentAllocations).values({
      PaymentRequestId: paymentRequest[0].PaymentRequestId,
      CreditId: credit[0].CreditId,
      AllocatedAmount: '100',
    });

    // 5. Get allocations
    const allocations = await PaymentRequestRepository.getAllocations(paymentRequest[0].PaymentRequestId);

    // 6. Assertions
    expect(allocations).to.have.lengthOf(1);
    expect(allocations[0].CreditAmount).to.equal('100.00');
    expect(allocations[0].AllocatedAmount).to.equal('100.00');
  });
});
