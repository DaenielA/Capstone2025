'use server'

export interface SaleUnit {
  unit: string;
  price: number;
  isDefault: boolean;
}

import { db } from '@/db/connection'; // Assuming this is the correct db import
import { MemberRepository, JoinedMemberResult } from '@/db/repositories'; // Import JoinedMemberResult
import { ProductRepository } from '@/db/repositories/ProductRepository';
import { TransactionRepository } from '@/db/repositories/TransactionRepository';
import { Products, Members, Categories, Users, MemberActivities, Credits } from '@/db/schema';
import { eq, like, or, and, gte, lt, sql } from 'drizzle-orm';
import { SendPurchaseNotification } from '@/lib/notifications';

import { GetCurrentSession } from '@/lib/auth';
// Product interfaces
export interface Product {
  Id: string;
  Name: string;
  Price: number;
  basePrice: number;
  Category: string;
  Image: string;
  Barcode: string;
  Stock: number;
  Description: string;
  discountType?: "percentage" | "fixed"; // Added
  discountValue?: number; // Added
  ExpiryDate?: string | null;
  UpdatedAt?: string | null;
  IsActive?: boolean;
  bulkPrice?: number;
  bulkUnitName?: string;
  piecesPerBulk?: number;
  piecePrice?: number;
  pieceUnitName?: string;
  saleUnits: SaleUnit[];
}



// Member interface
export interface Member {
  Id: string;
  Name: string;
  MemberId: string;
  Email: string;
  CreditLimit: number;
  CurrentCredit: number;
}

// Interface for the full member profile data used in member-facing pages
export interface MemberProfileData extends Member {
  joinDate: string;
  phone?: string;
  address?: string;
  profilePicture?: string | null;
  purchaseHistory: Purchase[];
  upcomingPayments: any[]; // Replace with actual type if available
  paymentHistory: any[]; // Replace with actual type if available
  recentItems: any[]; // Replace with actual type if available
  totalPurchases: number;
  creditUtilization: number;
  availableCredit: number;
  memberID: string;
}

export interface Purchase extends Transaction {}
export interface ItemDetails extends TransactionItem {}

// This was missing an export, causing errors in other files.
export interface Payment {
  id: string;
  dueDate?: string;
  date?: string;
  amount: number;
  description?: string;
  method?: string;
  status?: string;
}
// Transaction interfaces
export interface TransactionItem {
  Name: string;
  Quantity: number;
  Price: number;
  basePrice: number;
  OriginalPrice: number;
  PieceUnitName?: string;
}

export interface Transaction {
  Id: string;
  Date: string;
  Timestamp: Date; // Add this
  Time: string;
  Items: number;
  MemberEmail?: string;
  ManualDiscountAmount?: number;
  DiscountAmount?: number; // Added discount amount
  Total: number;
  PaymentMethod: string;
  Status: string;
  Member?: string;
  MemberId?: string;
  Cashier: string;
  ItemDetails: TransactionItem[];
}

async function fetchAndMapProducts(whereClause?: any): Promise<Product[]> {
  try {
    let query = db.select({
        // By explicitly selecting columns, we ensure Drizzle generates the correct query
        // and provides a flat object structure, avoiding the nested 'Products' object.
        ProductId: Products.ProductId,
        Name: Products.Name,
        Price: Products.Price,
        BasePrice: Products.BasePrice,
        CategoryName: Categories.Name,
        Image: Products.Image,
        Sku: Products.Sku,
        StockQuantity: Products.StockQuantity,
        Description: Products.Description,
        profitType: Products.profitType,
        profitValue: Products.profitValue,
        ExpiryDate: Products.ExpiryDate,
        IsActive: Products.IsActive,
        UpdatedAt: Products.UpdatedAt,
        BulkPrice: Products.Price, // Corrected: Use the main Price as the BulkPrice for now
        bulkUnitName: Products.bulkUnitName,
        piecesPerBulk: Products.piecesPerBulk,
        piecePrice: Products.piecePrice,
        pieceUnitName: Products.pieceUnitName,
    })
      .from(Products)
      .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId));

    const finalQuery = whereClause ? query.where(whereClause) : query;

    const productsData = await finalQuery;

    // Filter out any null or undefined products before mapping
    const validProducts = productsData.filter(product => product != null);

    return validProducts.map((product) => {
      const saleUnits: SaleUnit[] = [];

      saleUnits.push({
        unit: product.bulkUnitName || 'unit', // Changed 'pack' to 'unit' as a more generic default
        price: parseFloat(product.Price ?? '0'),
        isDefault: true,
      });

      const piecePriceNum = product.piecePrice ? parseFloat(String(product.piecePrice)) : NaN;

      if (!isNaN(piecePriceNum) && product.pieceUnitName) {
        saleUnits.push({
          unit: product.pieceUnitName,
          price: piecePriceNum,
          isDefault: false,
        });
      }

      // The 'saleUnits' property isn't part of the Product interface yet.
      // We'll need to add it there. For now, this structure is ready for when you do.
      // The returned object should match the Product interface.
      // Note: The 'saleUnits' property is not yet on the Product interface.
      // You will need to add `saleUnits: SaleUnit[];` to the Product interface.
      return {
        Id: product.ProductId.toString(),
        Name: product.Name,
        Price: parseFloat(product.Price ?? '0'),
        basePrice: parseFloat(product.BasePrice ?? '0'),
        Category: product.CategoryName?.toLowerCase() || "uncategorized",
        Image: product.Image || "",
        Barcode: product.Sku,
        Stock: parseFloat(product.StockQuantity || '0'),
        Description: product.Description || "",
        discountType: product.profitType as "percentage" | "fixed" | undefined,
        discountValue: parseFloat(product.profitValue ?? '0'),
        ExpiryDate: product.ExpiryDate ? new Date(product.ExpiryDate).toISOString() : null,
        UpdatedAt: product.UpdatedAt ? new Date(product.UpdatedAt).toISOString() : null,
        IsActive: product.IsActive,
        bulkPrice: product.BulkPrice ? parseFloat(product.BulkPrice) : undefined,
        bulkUnitName: product.bulkUnitName ?? (product as any).BulkUnitName ?? undefined,
        piecesPerBulk: product.piecesPerBulk ?? (product as any).PiecesPerBulk ?? undefined,
        piecePrice: product.piecePrice ? parseFloat(String(product.piecePrice)) : ((product as any).PiecePrice ? parseFloat(String((product as any).PiecePrice)) : undefined),
        pieceUnitName: product.pieceUnitName ?? (product as any).PieceUnitName ?? undefined,
        saleUnits: saleUnits,
      };
    });
  } catch (error) {
    console.error("Error fetching and mapping products:", error);
    throw new Error("Failed to fetch products from database.");
  }
}

// Get all active products
export async function getProducts(): Promise<Product[]> {
  return fetchAndMapProducts(eq(Products.IsActive, true));
}

// Get products by category
export async function getProductsByCategory(categoryName: string): Promise<Product[]> {
  if (categoryName === "all") {
    return getProducts();
  }

  const whereClause = and(
    eq(Categories.Name, categoryName),
    eq(Products.IsActive, true)
  );
  return fetchAndMapProducts(whereClause);
}

// Search products
export async function searchProducts(searchQuery: string): Promise<Product[]> {
  const whereClause = and(
    or(
      like(Products.Name, `%${searchQuery}%`),
      like(Products.Sku, `%${searchQuery}%`),
      like(Products.Description, `%${searchQuery}%`),
      like(sql`"Products"."ProductId"::text`, `%${searchQuery}%`)
    ),
    eq(Products.IsActive, true)
  );
  return fetchAndMapProducts(whereClause);
}


// Get all categories
export async function getCategories(): Promise<string[]> {
  try {
    const categoriesData = await db.select().from(Categories);
    return categoriesData.map(category => category.Name.toLowerCase());
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// Get all members
export async function getMembers(): Promise<Member[]> {
  try {
    const membersData = await db.select().from(Members);
    
    return membersData.map((member) => ({
      Id: member.MemberId.toString(),
      Name: member.Name,
      MemberId: `M${member.MemberId.toString().padStart(3, '0')}`, // Format to match mock data
      Email: member.Email,
      CreditLimit: parseFloat(member.CreditLimit || "0"),
      CurrentCredit: parseFloat(member.CreditBalance || "0"),
    }));
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
}

// Search members
export async function searchMembers(searchQuery: string): Promise<Member[]> {
  try {
    // Use a direct Drizzle query to avoid the incorrect join in the repository
    const membersData = await db.select()
      .from(Members)
      .where(
        or(
          like(Members.Name, `%${searchQuery}%`),
          like(Members.Email, `%${searchQuery}%`),
          // Allow searching by formatted MemberId (e.g., "M001") by stripping non-digits
          like(sql`"Members"."MemberId"::text`, `%${searchQuery.replace(/\D/g, '')}%`)
        )
      );

    return membersData.map(member => ({
      Id: member.MemberId.toString(),
      Name: member.Name,
      MemberId: `M${member.MemberId.toString().padStart(3, '0')}`, // Format to match mock data
      Email: member.Email,
      CreditLimit: parseFloat(member.CreditLimit || "0"),
      CurrentCredit: parseFloat(member.CreditBalance || "0"),
    }));
  } catch (error) {
    console.error(`Error searching members with query "${searchQuery}":`, error);
    return [];
  }
}

// Get transactions
// Get a single transaction by its ID
export async function getTransactionById(transactionId: string): Promise<Transaction | null> {
  try {
    const id = parseInt(transactionId.replace('TRX-', ''), 10);
    if (isNaN(id)) {
      console.error(`Invalid transaction ID format: ${transactionId}`);
      return null;
    }

    // Fetch the transaction with its related items, products, members, and users.
    const transactionData = await db.query.Transactions.findFirst({
      where: (transactions, { eq }) => eq(transactions.TransactionId, id),
      with: {
        TransactionItems: {
          with: {
            Product: true,
          },
        },
        Member: true,
        User: true,
      },
    });

    if (!transactionData) {
      return null;
    }

    // Reuse the mapping logic from getTransactions
    const timestamp = transactionData.Timestamp;
    const date = timestamp.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const time = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const totalItems = transactionData.TransactionItems.reduce((sum: number, item) => sum + Number(item.Quantity), 0);

    const itemDetails: TransactionItem[] = transactionData.TransactionItems.map(item => ({
      Name: item.Product?.Name || "Unknown Product",
      Quantity: Number(item.Quantity),
      Price: parseFloat(item.PriceAtTimeOfSale),
      basePrice: parseFloat(item.BasePriceAtTimeOfSale || '0'),
      OriginalPrice: parseFloat(item.Product?.Price || '0'),
      PieceUnitName: item.PieceUnitName || undefined,
    }));

    const totalDiscount = transactionData.TransactionItems.reduce((sum: number, item) => {
      const originalPrice = parseFloat(item.Product?.Price || '0');
      const salePrice = parseFloat(item.PriceAtTimeOfSale);
      return sum + (originalPrice - salePrice) * Number(item.Quantity);
    }, 0);

    let status = 'Completed';
    if ((transactionData.PaymentMethod || "").toLowerCase() === 'credit') {
      const spentCredits = await db
        .select({ Amount: Credits.Amount, PaidAmount: Credits.PaidAmount })
        .from(Credits)
        .where(and(
          eq(Credits.RelatedTransactionId, transactionData.TransactionId),
          eq(Credits.Type, 'Spent')
        ));

      if (spentCredits.length > 0) {
        const totalSpentInCents = spentCredits.reduce((sum, c) => sum + Math.round(parseFloat(c.Amount) * 100), 0);
        const totalPaidInCents = spentCredits.reduce((sum, c) => sum + Math.round(parseFloat(c.PaidAmount || '0') * 100), 0);

        if (totalPaidInCents >= totalSpentInCents) {
          status = 'Paid';
        } else if (totalPaidInCents > 0) {
          status = 'Partial';
        } else {
          status = 'Pending';
        }
      } else {
        status = 'Pending';
      }
    }

    return {
      Id: `TRX-${transactionData.TransactionId}`,
      Date: date,
      Timestamp: timestamp,
      Time: time,
      Items: totalItems,
      Total: parseFloat(transactionData.TotalAmount),
      PaymentMethod: transactionData.PaymentMethod || "cash",
      ManualDiscountAmount: parseFloat(transactionData.ManualDiscountAmount || "0"),
      DiscountAmount: totalDiscount,
      Status: status,
      Member: transactionData.Member?.Name,
      MemberId: transactionData.Member ? `M${transactionData.Member.MemberId.toString().padStart(3, '0')}` : undefined,
      MemberEmail: transactionData.Member?.Email,
      Cashier: transactionData.User?.Name || "Unknown Cashier",
      ItemDetails: itemDetails,
    };

  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    return null;
  }
}

export async function getTransactions(options?: { startDate?: Date, endDate?: Date, memberId?: number }): Promise<Transaction[]> {
  try {
    // Fetch all transactions with their related items, products, members, and users in one go.
    const transactionsData = await db.query.Transactions.findMany({
      where: (transactions, { and, gte, lt }) => {
        const conditions = [];
        if (options?.startDate && options.endDate) {
          conditions.push(gte(transactions.Timestamp, options.startDate), lt(transactions.Timestamp, options.endDate));
        }
        if (options?.memberId) {
          conditions.push(eq(transactions.MemberId, options.memberId));
        }
        if (conditions.length > 0) return and(...conditions);
      },
      orderBy: (transactions, { desc }) => [desc(transactions.Timestamp)],
      with: {
        TransactionItems: {
          with: {
            Product: true,
          },
        },
        Member: true,
        User: true,
      },
    });

    // Asynchronously map transactions to include the correct status
    const transactions = await Promise.all(transactionsData.map(async (transaction) => {
      // Format date and time
      const timestamp = transaction.Timestamp;
      const date = timestamp.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      const time = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Calculate total items
      const totalItems = transaction.TransactionItems.reduce((sum: number, item) => sum + Number(item.Quantity), 0);

      // Format transaction items for details
      const itemDetails: TransactionItem[] = transaction.TransactionItems.map(item => ({
        Name: item.Product?.Name || "Unknown Product",
        Quantity: Number(item.Quantity),
        Price: parseFloat(item.PriceAtTimeOfSale),
        basePrice: parseFloat(item.BasePriceAtTimeOfSale || '0'),
        OriginalPrice: parseFloat(item.Product?.Price || '0'),
        PieceUnitName: item.PieceUnitName || undefined,
      }));

      // Calculate total discount from price differences
      const totalDiscount = transaction.TransactionItems.reduce((sum: number, item) => {
        const originalPrice = parseFloat(item.Product?.Price || '0');
        const salePrice = parseFloat(item.PriceAtTimeOfSale);
        return sum + (originalPrice - salePrice) * Number(item.Quantity);
      }, 0);

      // Determine transaction status
      let status = 'Completed'; // Default for non-credit transactions
      if ((transaction.PaymentMethod || "").toLowerCase() === 'credit') {
        const spentCredits = await db
          .select({ Amount: Credits.Amount, PaidAmount: Credits.PaidAmount })
          .from(Credits)
          .where(and(
            eq(Credits.RelatedTransactionId, transaction.TransactionId),
            eq(Credits.Type, 'Spent')
          ));

        if (spentCredits.length > 0) {
          const totalSpentInCents = spentCredits.reduce((sum, c) => sum + Math.round(parseFloat(c.Amount) * 100), 0);
          const totalPaidInCents = spentCredits.reduce((sum, c) => sum + Math.round(parseFloat(c.PaidAmount || '0') * 100), 0);

          if (totalPaidInCents >= totalSpentInCents) {
            status = 'Paid';
          } else if (totalPaidInCents > 0) {
            status = 'Partial';
          } else {
            status = 'Pending';
          }
        } else {
          // If a 'credit' transaction has no 'Spent' record, it's pending creation
          status = 'Pending';
        }
      }

      return {
        Id: `TRX-${transaction.TransactionId}`,
        Date: date,
        Timestamp: timestamp,
        Time: time,
        Items: totalItems,
        Total: parseFloat(transaction.TotalAmount),
        PaymentMethod: transaction.PaymentMethod || "cash",
        ManualDiscountAmount: parseFloat(transaction.ManualDiscountAmount || "0"),
        DiscountAmount: totalDiscount,
        Status: status,
        Member: transaction.Member?.Name,
        MemberId: transaction.Member ? `M${transaction.Member.MemberId.toString().padStart(3, '0')}` : undefined,
        MemberEmail: transaction.Member?.Email,
        Cashier: transaction.User?.Name || "Unknown Cashier",
        ItemDetails: itemDetails,
      };
    }));

    return transactions;

  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

interface CreateTransactionParams {
  items: { ProductId: number; Quantity: number; Price: number; basePrice: number; isPieceSale: boolean }[];
  totalAmount: number;
  paymentMethod: string;
  userId: number;
  memberId?: number;
  manualDiscount?: number;
  creditMarkupAmount?: number;
}


// Create transaction
export async function createTransaction(params: CreateTransactionParams): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // Use a try-catch block to handle errors from the atomic transaction
  const { items, totalAmount, paymentMethod, userId, memberId, manualDiscount, creditMarkupAmount } = params;

  try {
    let result;

    // Ensure memberId is null if undefined, which is safer for database operations.
    const finalMemberId = memberId === undefined ? null : memberId;

    // Format items data for the repository
    const transactionItems = items.map((item) => {
      return {
        // Pass all necessary info to the repository.
        // The repository should be responsible for stock deduction logic,
        // including handling piece vs. pack sales.
        ...item,
        ProductId: item.ProductId,
        Quantity: item.Quantity.toString(),
        PriceAtTimeOfSale: (item.Price || 0).toFixed(2),
        BasePriceAtTimeOfSale: (item.basePrice || 0).toFixed(2),
        Profit: (((item.Price || 0) - (item.basePrice || 0)) * item.Quantity).toFixed(2),
      };
    });

    
    // A credit transaction must be associated with a member.
    if (paymentMethod === 'credit' && !memberId) {
      return {
        success: false,
        error: "A member must be selected for credit transactions.",
      };
    }

    if (paymentMethod === 'credit' && memberId) {
      // Use the new atomic method for credit transactions
      result = await TransactionRepository.processCreditTransaction(
        {
          UserId: userId, // No change needed here as we use the named property
          MemberId: finalMemberId,
          TotalAmount: totalAmount.toFixed(2),
          PaymentMethod: paymentMethod,
          ManualDiscountAmount: manualDiscount?.toFixed(2),
          CreditMarkupAmount: creditMarkupAmount?.toFixed(2),
        },
        transactionItems
      );
    } else {
      // Use the new atomic method for cash/non-credit transactions
      result = await TransactionRepository.processCashTransaction(
        {
          UserId: userId,
          MemberId: finalMemberId, // Include MemberId when a member is selected for cash transactions
          TotalAmount: totalAmount.toFixed(2),
          PaymentMethod: paymentMethod,
          ManualDiscountAmount: manualDiscount?.toFixed(2),
        },
        transactionItems);

      // The stock update is now handled inside processCashTransaction.
      // We can still check for low stock here, after the transaction is successful.
      for (const item of items) {
        // This read operation is outside the DB transaction, which is fine.
        const product = await ProductRepository.GetById(item.ProductId); 
        const STOCK_THRESHOLD = 10;
        if (product && product.StockQuantity <= STOCK_THRESHOLD) {
          // We can check if the stock *was* low before this transaction to avoid duplicate notifications
          // but for simplicity, we'll just check the new stock level.
          const { SendLowStockNotification } = await import('@/lib/notifications');
          await SendLowStockNotification(
            item.ProductId,
            product.Name,
            product.StockQuantity
          );
        }
      }
    }

    if (!result || !result.TransactionId) {
      throw new Error("Transaction failed to process.");
    }

    // Log member activity for Activity Log
    try {
      if (memberId) {
        const member = await MemberRepository.GetById(memberId);
        if (member) {
          const action = paymentMethod === 'credit' ? 'made a credit purchase' : 'made a purchase';
          await db.insert(MemberActivities).values({
            MemberId: memberId,
            Action: action,
            Amount: totalAmount.toString(),
            RelatedTransactionId: result.TransactionId,
          });
        }
      }
    } catch (logError) {
      console.error("Error logging member activity:", logError);
      // Don't fail the transaction if logging fails
    }

    // Send purchase notification to admins
    try {
      if (memberId) {
        const member = await MemberRepository.GetById(memberId);
        if (member) {
          await SendPurchaseNotification(result.TransactionId, member.Name, totalAmount, items.length);
        }
      } else {
        // For non-member purchases, still send notification with generic info
        await SendPurchaseNotification(result.TransactionId, "Guest Customer", totalAmount, items.length);
      }
    } catch (notifError) {
      console.error("Error sending purchase notification:", notifError);
      // Don't fail the transaction if notification fails
    }

    return {
      success: true,
      transactionId: `TRX-${result.TransactionId}`,
    };
  } catch (error: unknown) {
    console.error("Error creating transaction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

// Get full profile data for the currently logged-in member
export async function GetCurrentMemberData(): Promise<MemberProfileData | null> {
  try {
    const session = await GetCurrentSession();
    if (!session?.UserId) {
      console.error("No active member session found.");
      return null;
    }

    const memberId = parseInt(session.UserId, 10);

    // 1. Fetch the member's core data
    const memberData = await db.query.Members.findFirst({
      where: eq(Members.UserId, memberId),
    });

    if (!memberData) {
      console.error(`No member found with user ID: ${memberId}`);
      return null;
    }

    // 2. Fetch the member's transactions using the dedicated function
    const purchaseHistory = await getTransactions({ memberId: memberData.MemberId });

    // 3. Assemble the full profile
    const creditLimit = parseFloat(memberData.CreditLimit || "0");
    const creditBalance = parseFloat(memberData.CreditBalance || "0");
    const availableCredit = creditLimit - creditBalance;
    const creditUtilization = creditLimit > 0 ? (creditBalance / creditLimit) * 100 : 0;

    return {
      ...(memberData as Omit<typeof memberData, 'MemberId'>),
      Id: memberData.MemberId.toString(),
      MemberId: memberData.MemberId.toString(),
      Name: memberData.Name,
      memberID: `M${memberData.MemberId.toString().padStart(4, '0')}`,
      Email: memberData.Email,
      CreditLimit: creditLimit,
      CurrentCredit: creditBalance,
      joinDate: memberData.CreatedAt.toISOString(),
      phone: memberData.Phone || undefined,
      address: memberData.Address || undefined,
      profilePicture: null, // Assuming no profile picture field for now
      purchaseHistory: purchaseHistory as Purchase[],
      // Mock data for parts not yet implemented
      upcomingPayments: [],
      paymentHistory: [],
      recentItems: [],
      totalPurchases: purchaseHistory.length,
      creditUtilization: parseFloat(creditUtilization.toFixed(2)),
      availableCredit: availableCredit,
    };

  } catch (error) {
    console.error("Error getting current member data:", error);
    return null;
  }
}

// Send receipt email
export async function sendReceiptEmail(
  transactionId: string,
  customerEmail: string,
  customerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(` Preparing to send receipt email for transaction ${transactionId}`);
    console.log(`[EMAIL] Receipt email target: ${customerEmail} (${customerName})`);
    
    // Get transaction details
    const transactionIdNum = parseInt(transactionId.replace('TRX-', ''), 10);
    console.log(`[EMAIL] Fetching transaction details for ID: ${transactionIdNum}`);
    const transaction = await TransactionRepository.GetById(transactionIdNum);
    
    if (!transaction) {
      console.error(`[EMAIL ERROR] Transaction ${transactionIdNum} not found in database`);
      return { 
        success: false, 
        error: "Transaction not found" 
      };
    }
    
    console.log(`[EMAIL] Found transaction data: PaymentMethod=${transaction.PaymentMethod}, Amount=${transaction.TotalAmount}`);
    
    // Get transaction items
    console.log(`[EMAIL] Fetching transaction items...`);
    const itemsData = await TransactionRepository.GetItemsByTransactionId(transactionIdNum);
    console.log(`[EMAIL] Found ${itemsData.length} items in transaction`);
    
    // Format date and time
    const timestamp = transaction.Timestamp;
    const date = timestamp.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const time = timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    
    // Format transaction items for receipt
    const items = itemsData.map((item: any) => ({
      name: item.Product?.Name || "Unknown Product",
      quantity: Number(item.Quantity),
      price: parseFloat(item.PriceAtTimeOfSale),
      subtotal: Number(item.Quantity) * parseFloat(item.PriceAtTimeOfSale)
    }));

    
    // Get cashier name
    const cashier = transaction.User?.Name || "Unknown Cashier";
    
    // Calculate subtotal
    const subtotal = items.reduce((total: number, item: { subtotal: number }) => total + item.subtotal, 0);
    
    // Prepare receipt data
    const receiptData = {
      transactionId,
      date: `${date} at ${time}`,
      total: parseFloat(transaction.TotalAmount),
      items,
      paymentMethod: transaction.PaymentMethod || "Cash",
      cashier,
      subtotal,
      storeName: "Pandol Cooperative",
      storeAddress: "Pandol, Corella, Bohol",
      storePhone: "+63 (38) 412-5678"
    };
    
    console.log(`[EMAIL] Receipt data prepared: ${items.length} items, total: ${receiptData.total}`);
    
    // Dynamic import of EmailService to avoid circular dependency
    console.log(`[EMAIL] Initializing EmailService...`);
    const startTime = Date.now();
    const { EmailService } = await import('@/lib/email');
    
    // Send the email
    console.log(`[EMAIL] Sending receipt email to ${customerEmail}...`);
    const emailResult = await EmailService.SendReceiptEmail(
      customerEmail,
      customerName,
      receiptData
    );

    console.log(`[EMAIL] Email send result: ${emailResult}`);
    
    const duration = Date.now() - startTime;
    console.log(`[EMAIL] Receipt email sent successfully to ${customerEmail}`);
    console.log(`[EMAIL] Email sending completed in ${duration}ms`);
    console.log(`[EMAIL] Email service response: ${JSON.stringify({
      messageId: emailResult.messageId,
      response: emailResult.response
    })}`);
    
    return { success: true };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send receipt email to ${customerEmail} for transaction ${transactionId}`);
    console.error('[EMAIL ERROR] Error details:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

