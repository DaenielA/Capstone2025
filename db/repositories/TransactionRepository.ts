import { db } from '@/db/connection';
import { Transactions, TransactionItems, Products, Users, Members, Credits, productsRelations, PackOpeningLogs } from '@/db/schema';
import { eq, desc, and, sum, count, gte, lte, sql } from 'drizzle-orm';

type NewTransaction = typeof Transactions.$inferInsert;
type NewTransactionItem = typeof TransactionItems.$inferInsert;

export const TransactionRepository = {
  async processCreditTransaction(
  transactionData: Omit<NewTransaction, 'CreatedAt' | 'UpdatedAt' | 'Timestamp'>,
  items: Omit<NewTransactionItem, 'TransactionId'>[]
) {
  const result = await this.CreateWithItems(transactionData, items);
  
  // Create credit record for the purchase
  const totalAmount = parseFloat(result.TotalAmount);
  await db.insert(Credits).values({
    MemberId: transactionData.MemberId!,
    Amount: totalAmount.toFixed(2),
    Type: 'Spent',
    RelatedTransactionId: result.TransactionId,
    Notes: `Credit purchase - Transaction ${result.TransactionId}`,
    Timestamp: result.Timestamp,
  });
  
  // Update member's credit balance
  await db.update(Members)
    .set({ 
      CreditBalance: sql`${Members.CreditBalance} + ${totalAmount}`
    })
    .where(eq(Members.MemberId, transactionData.MemberId!));
  
  return result;
},

  async processCashTransaction(
    transactionData: Omit<NewTransaction, 'CreatedAt' | 'UpdatedAt' | 'Timestamp'>,
    items: Omit<NewTransactionItem, 'TransactionId'>[]
  ) {
    // For cash transactions, we can directly use the CreateWithItems method.
    return this.CreateWithItems(transactionData, items);
  },

  async GetByMemberId(memberId: number) {
    return await db.query.Transactions.findMany({
      where: eq(Transactions.MemberId, memberId),
      with: {
        User: {
          columns: {
            Name: true,
          },
        },
      },
      orderBy: [desc(Transactions.Timestamp)],
      limit: 50,
    });
  },

  async GetAll() {
    return await db.query.Transactions.findMany({
      with: {
        User: {
          columns: {
            Name: true,
          },
        },
        Member: {
            columns: {
                Name: true,
            }
        }
      },
      orderBy: [desc(Transactions.Timestamp)],
      limit: 100,
    });
  },

  async CreateWithItems(
    transactionData: Omit<NewTransaction, 'TransactionId' | 'CreatedAt' | 'UpdatedAt'>,
    items: Omit<NewTransactionItem, 'TransactionId' | 'TransactionItemId'>[]
  ) {
    return db.transaction(async (tx) => {
      // Verify MemberId exists if provided
      if (transactionData.MemberId) {
        const member = await tx.query.Members.findFirst({
          where: eq(Members.MemberId, transactionData.MemberId),
        });
        if (!member) {
          throw new Error(`Cannot create transaction. Member with ID ${transactionData.MemberId} does not exist.`);
        }
      }

      // 1. Create the transaction to get its ID
      const transactionPayload: NewTransaction = {
        ...transactionData,
        Timestamp: transactionData.Timestamp || new Date()
      };

      // Conditionally add MemberId to avoid inserting null for cash transactions
      if (transactionData.MemberId) {
        transactionPayload.MemberId = transactionData.MemberId;
      }
      const [newTransaction] = await tx
        .insert(Transactions)
        .values(transactionPayload)
        .returning();

      if (!newTransaction) {
        throw new Error('Failed to create transaction record.');
      }

      // 2. Prepare transaction items with the new transaction ID and PieceUnitName
      const transactionItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productToSell = await tx.query.Products.findFirst({
          where: eq(Products.ProductId, item.ProductId),
        });

        if (!productToSell) {
          throw new Error(`Product with ID ${item.ProductId} not found.`);
        }

        transactionItems.push({
          ...item,
          TransactionId: newTransaction.TransactionId,
          PieceUnitName: (item as any).isPieceSale && productToSell.pieceUnitName ? productToSell.pieceUnitName : null,
        });
      }

      // 3. Insert all transaction items
      await tx.insert(TransactionItems).values(transactionItems);

      // 4. Update stock for each item
      for (const item of items) {
        let productToSell = await tx.query.Products.findFirst({
          where: eq(Products.ProductId, item.ProductId),
          with: {
            ParentProduct: true, // This is the correct property name for the 'PieceToPack' relation
          }
        });

        if (!productToSell) {
          throw new Error(`Product with ID ${item.ProductId} not found.`);
        }

        // Check if this is a piece sale (isPieceSale flag is set)
        const isPieceSale = (item as any).isPieceSale === true;

        if (isPieceSale && productToSell.piecesPerPack && productToSell.piecesPerPack > 0) {
          // PIECE SALE: Deduct from micro stock (currentPiecesPerPack) only
          const currentMicroStock = productToSell.currentPiecesPerPack ? Number(productToSell.currentPiecesPerPack) : 0;
          const itemQuantity = Number(item.Quantity);

          // Check if we have enough micro stock for this transaction
          if (currentMicroStock < itemQuantity) {
            throw new Error(`Insufficient micro stock for product ${productToSell.Name}. Only ${currentMicroStock} pieces available, but ${itemQuantity} requested.`);
          }

          // Deduct from micro stock
          const newMicroStock = currentMicroStock - itemQuantity;
          await tx.update(Products)
            .set({ currentPiecesPerPack: newMicroStock.toString() })
            .where(eq(Products.ProductId, item.ProductId));

        } else {

          // PACK SALE: Deduct from main stock (StockQuantity)
          const currentStock = Number(productToSell.StockQuantity);
          const itemQuantity = Number(item.Quantity);

          // Check if we have enough main stock
          if (currentStock < itemQuantity) {
            throw new Error(`Insufficient stock for product ${productToSell.Name}.`);
          }

          await tx
            .update(Products)
            .set({ StockQuantity: (currentStock - itemQuantity).toString() })
            .where(eq(Products.ProductId, item.ProductId));
        }

      }



      return {
        ...newTransaction,
        items: transactionItems,
      };
    });
  },  
  
  async GetById(transactionId: number) {
    return await db.query.Transactions.findFirst({
      where: eq(Transactions.TransactionId, transactionId),
      with: {
        User: true,
        Member: true,
      },
    });
  },

  async GetItemsByTransactionId(transactionId: number) {
    return await db.query.TransactionItems.findMany({
      where: eq(TransactionItems.TransactionId, transactionId),
      with: {
        Product: true,
      },
    });
  },


  async getSalesReport(startDate: Date, endDate: Date) {
    try {
        const result = await db
            .select({
                totalRevenue: sum(Transactions.TotalAmount),
                totalTransactions: count(Transactions.TransactionId),
                totalProfit: sum(TransactionItems.Profit),
            })
            .from(Transactions)
            .leftJoin(TransactionItems, eq(Transactions.TransactionId, TransactionItems.TransactionId))
            .where(and(
                gte(Transactions.Timestamp, startDate),
                lte(Transactions.Timestamp, endDate)
            ));

        const summary = result[0];

        return {
            totalRevenue: parseFloat(summary.totalRevenue || '0'),
            totalTransactions: summary.totalTransactions || 0,
            totalProfit: parseFloat(summary.totalProfit || '0'),
        };
    } catch (error) {
        console.error("Error generating sales report:", error);
        throw new Error("Failed to generate sales report.");
    }
  },
};
