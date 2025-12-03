import { db } from './db/connection.js';
import { Credits, Products, Transactions, TransactionItems, Members } from './db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { CreditRepository } from './db/repositories/CreditRepository.js';

async function testPenaltyApplication() {
  console.log('=== TESTING PENALTY APPLICATION ===');

  const now = new Date();
  console.log('Current date/time:', now.toISOString());

  // Get member 1's current balance
  const member = await db.select().from(Members).where(eq(Members.MemberId, 1)).limit(1);
  console.log('\nMember 1 current balance:', member[0]?.CreditBalance);

  // Get all credits for member 1
  const credits = await db.select().from(Credits).where(eq(Credits.MemberId, 1));
  console.log('\nCredits for member 1 BEFORE penalty application:');
  credits.forEach(credit => {
    console.log(`ID: ${credit.CreditId}, Amount: ${credit.Amount}, PaidAmount: ${credit.PaidAmount}, Status: ${credit.Status}, IsPenaltyApplied: ${credit.IsPenaltyApplied}, Timestamp: ${credit.Timestamp}`);
  });

  // Find overdue credits that should have penalties applied
  const overdueCredits = await db.select({
    creditId: Credits.CreditId,
    memberId: Credits.MemberId,
    creditAmount: Credits.Amount,
    creditPaidAmount: Credits.PaidAmount,
    creditTimestamp: Credits.Timestamp,
    productId: TransactionItems.ProductId,
    productCreditDueDays: Products.CreditDueDays,
    productCreditPenaltyType: Products.CreditPenaltyType,
    productCreditPenaltyValue: Products.CreditPenaltyValue,
    isPenaltyApplied: Credits.IsPenaltyApplied,
    notes: Credits.Notes,
  })
  .from(Credits)
  .innerJoin(Transactions, eq(Credits.RelatedTransactionId, Transactions.TransactionId))
  .innerJoin(TransactionItems, eq(Transactions.TransactionId, TransactionItems.TransactionId))
  .innerJoin(Products, eq(TransactionItems.ProductId, Products.ProductId))
  .where(and(
    eq(Credits.MemberId, 1),
    eq(Credits.Type, 'Spent'),
    gt(Credits.Amount, Credits.PaidAmount ?? '0.00'),
    eq(Credits.IsPenaltyApplied, false)
  ));

  console.log('\nOverdue credits found:', overdueCredits.length);
  overdueCredits.forEach(credit => {
    const transactionTimestamp = new Date(credit.creditTimestamp);
    const penaltyDueDate = new Date(transactionTimestamp);
    penaltyDueDate.setDate(transactionTimestamp.getDate() + (credit.productCreditDueDays || 0));

    console.log(`Credit ${credit.creditId}: Purchase=${transactionTimestamp.toISOString()}, Due=${penaltyDueDate.toISOString()}, Now=${now.toISOString()}`);
    console.log(`  Is overdue: ${now > penaltyDueDate}, PenaltyType: ${credit.productCreditPenaltyType}, PenaltyValue: ${credit.productCreditPenaltyValue}`);
  });

  // Apply penalties
  console.log('\n=== APPLYING PENALTIES ===');
  await CreditRepository.applyProductCreditPenalties();

  // Check credits after penalty application
  const creditsAfter = await db.select().from(Credits).where(eq(Credits.MemberId, 1));
  console.log('\nCredits for member 1 AFTER penalty application:');
  creditsAfter.forEach(credit => {
    console.log(`ID: ${credit.CreditId}, Amount: ${credit.Amount}, PaidAmount: ${credit.PaidAmount}, Status: ${credit.Status}, IsPenaltyApplied: ${credit.IsPenaltyApplied}, Notes: ${credit.Notes}`);
  });

  // Get member balance after
  const memberAfter = await db.select().from(Members).where(eq(Members.MemberId, 1)).limit(1);
  console.log('\nMember 1 balance after penalty application:', memberAfter[0]?.CreditBalance);

  console.log('\n=== TEST COMPLETE ===');
}

testPenaltyApplication().catch(console.error);
