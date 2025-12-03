import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/connection";
import { Products, Categories, TransactionItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/* -----------------------------
   ZOD SCHEMAS
----------------------------- */
const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sku: z.string().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  basePrice: z.coerce.number().min(0).optional(),
  profitType: z.enum(["percentage", "fixed"]).optional(),
  profitValue: z.coerce.number().min(0).optional(),
  creditMarkupType: z.enum(["percentage", "fixed"]).optional().nullable(),
  creditMarkupValue: z.coerce.number().min(0).optional().nullable(),
  creditDueDays: z.coerce.number().int().min(0).optional().nullable(),
  creditPenaltyType: z.enum(["percentage", "fixed"]).optional().nullable(),
  creditPenaltyValue: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).optional(),
  category: z.string().min(1).optional(),
  image: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  isActive: z.boolean().optional(),

  // piece/bulk fields
  piecePrice: z.coerce.number().min(0).optional().nullable(),
  pieceUnitName: z.string().optional().nullable(),
  piecesPerBulk: z.coerce.number().int().min(0).optional().nullable(),
  bulkUnitName: z.string().optional().nullable(),
  // conversion/pack fields - accept both naming conventions from client
  ConversionFactor: z.coerce.number().int().min(0).optional().nullable(),
  conversionFactor: z.coerce.number().int().min(0).optional().nullable(),
  ParentProductId: z.coerce.number().int().optional().nullable(),
  parentProductId: z.coerce.number().int().optional().nullable(),
  PiecesPerPack: z.coerce.number().int().min(0).optional().nullable(),
  piecesPerPack: z.coerce.number().int().min(0).optional().nullable(),
  currentPiecesPerPack: z.coerce.number().min(0).optional().nullable(),
});

const updateStockSchema = z.object({
  stock: z.coerce.number().int().min(0),
  lastRestocked: z.string().datetime().optional(),
});

/* -----------------------------
   GET handler
----------------------------- */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid product ID" },
        { status: 400 }
      );
    }

    const product = await db.query.Products.findFirst({
      where: eq(Products.ProductId, productId),
      with: { Category: true },
    });

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      );
    }

    // Format the product for consistent response
    const formattedProduct = {
      id: product.ProductId,
      name: product.Name,
      price: parseFloat(product.Price || '0'),
      basePrice: parseFloat(product.BasePrice || '0'),
      profitType: product.profitType,
      profitValue: parseFloat(product.profitValue || '0'),
      creditMarkupType: product.creditMarkupType,
      creditMarkupValue: product.creditMarkupValue ? parseFloat(product.creditMarkupValue) : undefined,
      creditDueDays: product.CreditDueDays ?? undefined,
      creditPenaltyType: product.CreditPenaltyType ?? undefined,
      creditPenaltyValue: product.CreditPenaltyValue ? parseFloat(product.CreditPenaltyValue) : undefined,
      category: product.Category?.Name || 'Uncategorized',
      sku: product.Sku,
      stock: product.StockQuantity,
      description: product.Description || '',
      supplier: product.Supplier || '',
      image: product.Image || '',
      expiryDate: product.ExpiryDate ? new Date(product.ExpiryDate).toISOString() : null,
      isActive: product.IsActive,
      piecePrice: product.piecePrice ? parseFloat(String(product.piecePrice)) : undefined,
      pieceUnitName: product.pieceUnitName || undefined,
      conversionFactor: product.conversionFactor ?? null,
      parentProductId: product.parentProductId ?? null,
      piecesPerPack: product.piecesPerPack ?? undefined,
      currentPiecesPerPack: product.currentPiecesPerPack ?? undefined,
      piecesPerBulk: product.piecesPerBulk || undefined,
      bulkUnitName: product.bulkUnitName || undefined,
      updatedAt: product.UpdatedAt ? new Date(product.UpdatedAt).toISOString() : null,
    };

    return NextResponse.json({ status: "success", product: formattedProduct });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

/* -----------------------------
   PUT handler
----------------------------- */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid product ID" },
        { status: 400 }
      );
    }

    const validation = updateProductSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid product data",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    /* --- Category handling --- */
    let categoryId: number | undefined = undefined;

    if (data.category) {
      const existing = await db.query.Categories.findFirst({
        where: eq(Categories.Name, data.category),
      });

      if (existing) {
        categoryId = existing.CategoryId;
      } else {
        const newCat = await db
          .insert(Categories)
          .values({ Name: data.category })
          .returning();

        categoryId = newCat[0].CategoryId;
      }
    }

    /* --- Update product --- */
    const updateFields: any = {
        Name: data.name,
        Description: data.description,
        Sku: data.sku,
        Price: data.price?.toString(),
        BasePrice: data.basePrice?.toString(),
        profitType: data.profitType,
        profitValue: data.profitValue?.toString(),
        creditMarkupType: data.creditMarkupType,
        creditMarkupValue: data.creditMarkupValue?.toString(),
        CreditDueDays: data.creditDueDays,
        CreditPenaltyType: data.creditPenaltyType,
        CreditPenaltyValue: data.creditPenaltyValue?.toString(),
        StockQuantity: data.stock != null ? data.stock.toString() : undefined,
        CategoryId: categoryId,
        Image: data.image,
        Supplier: data.supplier,
        ExpiryDate: data.expiryDate,
        IsActive: data.isActive,
        piecePrice: data.piecePrice?.toString(),
        pieceUnitName: data.pieceUnitName,
        // Keep previous piecesPerBulk & bulkUnitName mapping
        piecesPerBulk: data.piecesPerBulk,
        bulkUnitName: data.bulkUnitName,
        // Conversion fields - DB columns use PascalCase names
        conversionFactor: (data.ConversionFactor ?? data.conversionFactor) ?? undefined,
        parentProductId: (data.ParentProductId ?? data.parentProductId) ?? undefined,
        piecesPerPack: (data.PiecesPerPack ?? data.piecesPerPack) ?? undefined,
      };

    // If the client explicitly provides a micro stock or is setting a pack size, initialize/override current micro stock
    const providedPiecesPerPack = (data.PiecesPerPack ?? data.piecesPerPack);
    if (data.currentPiecesPerPack != null) {
      updateFields.currentPiecesPerPack = data.currentPiecesPerPack?.toString();
    } else if (providedPiecesPerPack != null) {
      // initialize micro stock to pack size when piecesPerPack is explicitly set
      updateFields.currentPiecesPerPack = String(providedPiecesPerPack);
    }

    updateFields.UpdatedAt = new Date();

    const [updated] = await db
      .update(Products)
      .set(updateFields)
      .where(eq(Products.ProductId, productId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      );
    }

    // Format the product for consistent response
    const formattedProduct = {
      id: updated.ProductId,
      name: updated.Name,
      price: parseFloat(updated.Price || '0'),
      basePrice: parseFloat(updated.BasePrice || '0'),
      profitType: updated.profitType,
      profitValue: parseFloat(updated.profitValue || '0'),
      creditMarkupType: updated.creditMarkupType,
      creditMarkupValue: updated.creditMarkupValue ? parseFloat(updated.creditMarkupValue) : undefined,
      creditDueDays: updated.CreditDueDays ?? undefined,
      creditPenaltyType: updated.CreditPenaltyType ?? undefined,
      creditPenaltyValue: updated.CreditPenaltyValue ? parseFloat(updated.CreditPenaltyValue) : undefined,
      category: ((updated.CategoryId ? (await db.query.Categories.findFirst({ where: eq(Categories.CategoryId, updated.CategoryId) }))?.Name : 'Uncategorized') ?? 'Uncategorized'),
      sku: updated.Sku,
      stock: updated.StockQuantity,
      description: updated.Description || '',
      supplier: updated.Supplier || '',
      image: updated.Image || '',
      expiryDate: updated.ExpiryDate ? new Date(updated.ExpiryDate).toISOString() : null,
      isActive: updated.IsActive,
      piecePrice: updated.piecePrice ? parseFloat(String(updated.piecePrice)) : undefined,
      pieceUnitName: updated.pieceUnitName || undefined,
      piecesPerBulk: updated.piecesPerBulk || undefined,
      bulkUnitName: updated.bulkUnitName || undefined,
      conversionFactor: updated.conversionFactor ?? null,
      parentProductId: updated.parentProductId ?? null,
      piecesPerPack: updated.piecesPerPack ?? undefined,
      currentPiecesPerPack: updated.currentPiecesPerPack ?? undefined,
      updatedAt: updated.UpdatedAt ? new Date(updated.UpdatedAt).toISOString() : null,
    };

    return NextResponse.json({ status: "success", product: formattedProduct });
  } catch (error: any) {
    if (
      error.message?.includes(
        "duplicate key value violates unique constraint"
      )
    ) {
      return NextResponse.json(
        { status: "error", message: "SKU already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

/* -----------------------------
   PATCH handler
----------------------------- */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const productId = parseInt(id);
    if (isNaN(productId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid product ID" },
        { status: 400 }
      );
    }

    const validation = updateStockSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid stock data",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { stock, lastRestocked } = validation.data;

    const [updated] = await db
      .update(Products)
      .set({
        StockQuantity: stock.toString(),
        UpdatedAt: lastRestocked ? new Date(lastRestocked) : new Date(),
      })
      .where(eq(Products.ProductId, productId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      );
    }

    // Format the product for consistent response
    const formattedProduct = {
      id: updated.ProductId,
      name: updated.Name,
      price: parseFloat(updated.Price || '0'),
      basePrice: parseFloat(updated.BasePrice || '0'),
      profitType: updated.profitType,
      profitValue: parseFloat(updated.profitValue || '0'),
      creditMarkupType: updated.creditMarkupType,
      creditMarkupValue: updated.creditMarkupValue ? parseFloat(updated.creditMarkupValue) : undefined,
      category: 'Uncategorized', // We don't have category info here
      sku: updated.Sku,
      stock: updated.StockQuantity,
      description: updated.Description || '',
      supplier: updated.Supplier || '',
      image: updated.Image || '',
      expiryDate: updated.ExpiryDate ? new Date(updated.ExpiryDate).toISOString() : null,
      isActive: updated.IsActive,
      piecePrice: updated.piecePrice ? parseFloat(String(updated.piecePrice)) : undefined,
      pieceUnitName: updated.pieceUnitName || undefined,
      piecesPerBulk: updated.piecesPerBulk || undefined,
      bulkUnitName: updated.bulkUnitName || undefined,
      // conversion fields
      conversionFactor: updated.conversionFactor ?? null,
      parentProductId: updated.parentProductId ?? null,
      piecesPerPack: updated.piecesPerPack ?? undefined,
      updatedAt: updated.UpdatedAt ? new Date(updated.UpdatedAt).toISOString() : null,
    };

    return NextResponse.json({ status: "success", product: formattedProduct });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}

/* -----------------------------
   DELETE handler
----------------------------- */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const permanent = searchParams.get('permanent');
    const productId = parseInt(id);

    // Validate Product ID
    if (isNaN(productId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid product ID." },
        { status: 400 }
      );
    }

    // This is the ARCHIVE (soft delete) case
    if (permanent !== 'true') {
      const [archived] = await db
        .update(Products)
        .set({ IsActive: false })
        .where(eq(Products.ProductId, productId))
        .returning();

      if (!archived) {
        return NextResponse.json(
          { status: "error", message: "Product not found for archiving." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: "success",
        message: "Product archived successfully.",
      });
    }

    // --- PERMANENT DELETE ---
    // This is the PERMANENT delete case, proceed with caution.
    console.log(`Attempting permanent delete for product ID: ${productId}`);

    // Step 1: Check for associated transactions. This is critical to prevent DB errors.
    const associatedTransactions = await db
      .select({ id: TransactionItems.TransactionItemId })
      .from(TransactionItems)
      .where(eq(TransactionItems.ProductId, productId))
      .limit(1);

    // Step 2: If transactions exist, block the deletion and return a helpful error.
    if (associatedTransactions.length > 0) {
      console.log(`Product ${productId} has associated transactions. Deletion blocked.`);
      return NextResponse.json(
        {
          status: "error",
          message:
            "This product is linked to past transactions and cannot be permanently deleted. Please archive it instead.",
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Step 3: No transactions found, proceed with permanent deletion.
    console.log(`No associated transactions found for product ${productId}. Proceeding with deletion.`);
    const [deleted] = await db
      .delete(Products)
      .where(eq(Products.ProductId, productId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { status: "error", message: "Product not found for permanent deletion." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Product permanently deleted successfully.",
    });

  } catch (error: any) {
    console.error(`[DELETE /api/products/${params.id}] Error:`, error);

    // Default error for database-level issues
    let errorMessage = "An unexpected error occurred on the server.";
    let errorStatus = 500;

    // Check for foreign key violation specifically - PostgreSQL error code for foreign_key_violation
    if (error.code === '23503') { 
        errorMessage = "This product is linked to past transactions and cannot be permanently deleted. Please archive it instead.";
        errorStatus = 409; // Conflict
    } else if (error.message) {
        errorMessage = error.message;
    }

    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: errorStatus }
    );
  }
}
