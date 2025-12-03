import { db } from './db/connection.js';
import { Credits, Products, Transactions, TransactionItems } from './db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

async function debugPenalty() {
  console.log('=== DEBUGGING PENALTY APPLICATION ===');

  const now = new Date();
  console.log('Current system time:', now.toISOString());

  // Check credits
  const credits = await db.select().from(Credits);
  console.log('\nAll credits:');
  credits.forEach(credit => {
    console.log(`ID: ${credit.CreditId}, Member: ${credit.MemberId}, Amount: ${credit.Amount}, PaidAmount: ${credit.PaidAmount}, Status: ${credit.Status}, IsPenaltyApplied: ${credit.IsPenaltyApplied}, Timestamp: ${credit.Timestamp}`);
  });

  // Check products
  const products = await db.select().from(Products);
  console.log('\nAll products:');
  products.forEach(product => {
    console.log(`ID: ${product.ProductId}, Name: ${product.Name}, CreditDueDays: ${product.CreditDueDays}, PenaltyType: ${product.CreditPenaltyType}, PenaltyValue: ${product.CreditPenaltyValue}`);
  });

  // Check transactions
  const transactions = await db.select().from(Transactions);
  console.log('\nAll transactions:');
  transactions.forEach(tx => {
    console.log(`ID: ${tx.TransactionId}, Member: ${tx.MemberId}, Timestamp: ${tx.Timestamp}, PaymentMethod: ${tx.PaymentMethod}`);
  });

  // Check transaction items
  const transactionItems = await db.select().from(TransactionItems);
  console.log('\nAll transaction items:');
  transactionItems.forEach(item => {
    console.log(`TransactionID: ${item.TransactionId}, ProductID: ${item.ProductId}, Quantity: ${item.Quantity}`);
  });

  // Now check what the penalty logic would find
  console.log('\n=== CHECKING PENALTY ELIGIBILITY ===');

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
    eq(Credits.Type, 'Spent'),
    gt(Credits.Amount, Credits.PaidAmount ?? '0.00'),
    eq(Credits.IsPenaltyApplied, false)
  ));

  console.log(`Found ${overdueCredits.length} credits that might be eligible for penalties`);

  for (const credit of overdueCredits) {
    const transactionTimestamp = new Date(credit.creditTimestamp);
    const penaltyDueDate = new Date(transactionTimestamp);
    penaltyDueDate.setDate(transactionTimestamp.getDate() + (credit.productCreditDueDays || 0));

    const isOverdue = now > penaltyDueDate;

    console.log(`\nCredit ${credit.creditId}:`);
    console.log(`  Purchase Date: ${transactionTimestamp.toISOString()}`);
    console.log(`  Due Days: ${credit.productCreditDueDays}`);
    console.log(`  Penalty Due Date: ${penaltyDueDate.toISOString()}`);
    console.log(`  Current Time: ${now.toISOString()}`);
    console.log(`  Is Overdue: ${isOverdue}`);
    console.log(`  Outstanding Amount: ${parseFloat(credit.creditAmount) - parseFloat(credit.creditPaidAmount || '0')}`);
    console.log(`  Penalty Type: ${credit.productCreditPenaltyType}`);
    console.log(`  Penalty Value: ${credit.productCreditPenaltyValue}`);

    if (isOverdue && credit.productCreditPenaltyType && credit.productCreditPenaltyValue) {
      const outstandingAmount = parseFloat(credit.creditAmount) - parseFloat(credit.creditPaidAmount || '0');
      let penaltyAmount = 0;

      if (credit.productCreditPenaltyType === 'percentage') {
        penaltyAmount = (outstandingAmount * parseFloat(credit.productCreditPenaltyValue)) / 100;
      } else if (credit.productCreditPenaltyType === 'fixed') {
        penaltyAmount = parseFloat(credit.productCreditPenaltyValue);
      }

      console.log(`  Calculated Penalty: ₱${penaltyAmount.toFixed(2)}`);
      console.log(`  New Total Would Be: ₱${(parseFloat(credit.creditAmount) + penaltyAmount).toFixed(2)}`);
    }
  }
}

debugPenalty().catch(console.error);
