// 'use server';

// import { db } from '@/db';
// import { Products, Transactions, TransactionItems } from '@/db/schema';
// import { and, eq, gte, sql } from 'drizzle-orm';

// // Define the structure of items coming from the POS frontend
// interface SaleItemInput {
//   productId: number;
//   quantity: number;
//   // Price is captured at time of sale in TransactionItems
// }

// interface CreateSaleArgs {
//   items: SaleItemInput[];
//   userId: number; // The ID of the user/staff processing the sale
//   totalAmount: string; // Use string for decimal precision
//   memberId?: number;
//   paymentMethod?: string;
//   manualDiscountAmount?: string;
// }

// export async function createPosTransaction({
//   items,
//   userId,
//   totalAmount,
//   memberId,
//   paymentMethod,
//   manualDiscountAmount,
// }: CreateSaleArgs) {
//   try {
//     const saleResult = await db.transaction(async (tx) => {
//       // 1. Create the main transaction record
//       const [newTransaction] = await tx
//         .insert(Transactions)
//         .values({
//           UserId: userId,
//           MemberId: memberId,
//           TotalAmount: totalAmount,
//           PaymentMethod: paymentMethod,
//           ManualDiscountAmount: manualDiscountAmount,
//         })
//         .returning();

//       if (!newTransaction) {
//         throw new Error('Failed to create transaction record.');
//       }

//       // 2. Process each item in the sale
//       for (const item of items) {
//         // 3. Find the product and deduct stock atomically
//         // This single query checks for stock and updates it, preventing race conditions.
//         const [updatedProduct] = await tx
//           .update(Products)
//           .set({
//             StockQuantity: sql`${Products.StockQuantity} - ${item.quantity}`,
//           })
//           .where(
//             and(
//               eq(Products.ProductId, item.productId),
//               gte(Products.StockQuantity, item.quantity) // Check for sufficient stock
//             )
//           )
//           .returning({
//             price: Products.Price,
//             basePrice: Products.BasePrice,
//           });

//         // 4. If updatedProduct is undefined, it means the WHERE clause failed
//         // (either product not found or insufficient stock). The transaction will be rolled back.
//         if (!updatedProduct) {
//           throw new Error(`Insufficient stock for product ID ${item.productId}. Sale has been cancelled.`);
//         }

//         // 5. Create the transaction item record to link the product to the sale
//         await tx.insert(TransactionItems).values({
//           TransactionId: newTransaction.TransactionId,
//           ProductId: item.productId,
//           Quantity: item.quantity,
//           PriceAtTimeOfSale: updatedProduct.price,
//           BasePriceAtTimeOfSale: updatedProduct.basePrice,
//           // Calculate profit for this line item
//           Profit: sql`(${updatedProduct.price} - ${updatedProduct.basePrice}) * ${item.quantity}`,
//         });
//       }

//       return newTransaction;
//     });

//     return { success: true, transaction: saleResult };
//   } catch (error: any) {
//     console.error('POS Transaction failed:', error);
//     return { success: false, error: error.message || 'An unexpected error occurred during the transaction.' };
//   }
// }