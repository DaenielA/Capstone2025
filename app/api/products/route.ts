import { NextRequest, NextResponse } from 'next/server';
import { ProductRepository } from '@/db/repositories';
import { db } from '@/db/connection';
import { Products, Categories, TransactionItems } from '@/db/schema';
import { eq, lte, and, exists } from 'drizzle-orm';
import { z } from 'zod';

/**
 * GET handler for retrieving all products
 */
export async function GET(request: Request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const activeOnly = searchParams.get('activeOnly') === 'true';
    
    // Start with a base query
    let conditions = [];
    
    // Apply category filter
    if (category && category !== 'all') {
      conditions.push(eq(Categories.Name, category));
    }
    
    // Apply low stock filter if requested
    if (lowStockOnly) {
      // Products.StockQuantity is a decimal field handled as string by Drizzle; compare with a string
      conditions.push(lte(Products.StockQuantity, '10'));
    }
    
    // Apply active filter if requested
    if (activeOnly) {
      conditions.push(eq(Products.IsActive, true));
    }
    
    // Execute the query with all conditions, selecting only required fields
    const rawProducts = await db.select({
      ProductId: Products.ProductId,
      Name: Products.Name,
      Price: Products.Price,
      BasePrice: Products.BasePrice,
      profitType: Products.profitType,
      profitValue: Products.profitValue,
      creditMarkupType: Products.creditMarkupType,
      creditMarkupValue: Products.creditMarkupValue,
      CreditDueDays: Products.CreditDueDays,
      CreditPenaltyType: Products.CreditPenaltyType,
      CreditPenaltyValue: Products.CreditPenaltyValue,
      CategoryName: Categories.Name,
      Image: Products.Image,
      Sku: Products.Sku,
      StockQuantity: Products.StockQuantity,
      Description: Products.Description,
      Supplier: Products.Supplier,
      IsActive: Products.IsActive,
      UpdatedAt: Products.UpdatedAt,
      ExpiryDate: Products.ExpiryDate,
      // Add these to select from DB
      piecePrice: Products.piecePrice,
      pieceUnitName: Products.pieceUnitName,
      conversionFactor: Products.conversionFactor,
      parentProductId: Products.parentProductId,
      piecesPerPack: Products.piecesPerPack,
      currentPiecesPerPack: Products.currentPiecesPerPack,
      hasTransactions: exists(
        db.select().from(TransactionItems).where(eq(TransactionItems.ProductId, Products.ProductId))
      ),
    })
      .from(Products)
      .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    // Format the products to match frontend expectations
    const products = rawProducts.map((product) => {
      const rawAny = product as any;
      return {
      id: product.ProductId,
      name: product.Name,
      price: parseFloat(product.Price),
      basePrice: parseFloat(product.BasePrice),
      profitType: product.profitType,
      profitValue: parseFloat(product.profitValue),
      creditMarkupType: product.creditMarkupType ?? undefined,
      creditMarkupValue: product.creditMarkupValue != null ? parseFloat(String(product.creditMarkupValue)) : undefined,
      creditDueDays: product.CreditDueDays ?? undefined,
      creditPenaltyType: product.CreditPenaltyType ?? undefined,
      creditPenaltyValue: product.CreditPenaltyValue != null ? parseFloat(String(product.CreditPenaltyValue)) : undefined,
      category: product.CategoryName || '',
      image: product.Image || '',
      sku: product.Sku || '',
      stock: product.StockQuantity,
      description: product.Description || '',
      supplier: product.Supplier || '',
      isActive: product.IsActive,
      ExpiryDate: product.ExpiryDate ? new Date(product.ExpiryDate).toISOString() : null,
      lastRestocked: product.UpdatedAt ? new Date(product.UpdatedAt).toISOString() : new Date().toISOString(),
      hasTransactions: product.hasTransactions,
      // Add these to map to frontend type (accounting for both casing scenarios)
      piecePrice: product.piecePrice ?? (rawAny.PiecePrice ? parseFloat(rawAny.PiecePrice) : undefined),
      pieceUnitName: product.pieceUnitName ?? rawAny.PieceUnitName ?? undefined,
      conversionFactor: product.conversionFactor ?? rawAny.ConversionFactor ?? null,
      parentProductId: product.parentProductId ?? rawAny.ParentProductId ?? null,
      piecesPerPack: product.piecesPerPack ?? rawAny.PiecesPerPack ?? undefined,
      currentPiecesPerPack: product.currentPiecesPerPack ?? rawAny.currentPiecesPerPack ?? undefined,
    };
    });

    return NextResponse.json({ status: 'success', products });
  } catch (error: any) {
    console.error('Error retrieving products:', error);
    
    return NextResponse.json({
      status: 'error',
      message: `Error retrieving products: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

// Schema for creating a new product, using Zod for robust validation.
const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  description: z.string().optional(),
  sku: z.string().min(1, "SKU is required."),
  price: z.coerce.number().positive("Price must be a positive number."),
  basePrice: z.coerce.number().min(0, "Base price must be a non-negative number."),
  profitType: z.enum(['percentage', 'fixed']),
  profitValue: z.coerce.number().min(0, "Profit value must be non-negative."),
  creditMarkupType: z.enum(['percentage', 'fixed']).optional(),
  creditMarkupValue: z.coerce.number().min(0).optional(),
  creditDueDays: z.coerce.number().int().min(0).optional(),
  creditPenaltyType: z.enum(['percentage', 'fixed']).optional(),
  creditPenaltyValue: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().int().min(0, "Stock quantity must be a non-negative integer."),
  category: z.string().min(1, "Category name is required."),
  image: z.string().optional(),
  supplier: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
});

// Allow optional conversion fields when creating a product
const createProductExtras = z.object({
  // Accept both PascalCase and camelCase from the frontend for compatibility
  ConversionFactor: z.coerce.number().int().min(0).optional().nullable(),
  conversionFactor: z.coerce.number().int().min(0).optional().nullable(),
  ParentProductId: z.coerce.number().int().optional().nullable(),
  parentProductId: z.coerce.number().int().optional().nullable(),
  PiecesPerPack: z.coerce.number().int().min(0).optional().nullable(),
  piecesPerPack: z.coerce.number().int().min(0).optional().nullable(),
  piecePrice: z.coerce.number().min(0).optional().nullable(),
  PiecePrice: z.coerce.number().min(0).optional().nullable(),
  pieceUnitName: z.string().optional().nullable(),
  PieceUnitName: z.string().optional().nullable(),
  currentPiecesPerPack: z.coerce.number().min(0).optional().nullable(),
});

/**
 * POST handler for creating a new product
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid product data.',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { data } = validation;
    // Parse optional extras if provided
    const extrasValidation = createProductExtras.safeParse(body);
    const extras = extrasValidation.success ? extrasValidation.data : {} as any;

    // Find or create the category
    let categoryId;
    
    // Find existing category
    const existingCategory = await db
      .select()
      .from(Categories)
      .where(eq(Categories.Name, data.category))
      .limit(1);
    
    if (existingCategory.length > 0) {
      categoryId = existingCategory[0].CategoryId;
    } else {
      // Create new category
      const newCategory = await db
        .insert(Categories)
        .values({
          Name: data.category,
          Description: `Category for ${data.category} products`,
        })
        .returning();
      
      categoryId = newCategory[0].CategoryId;
    }

    // Parse expiry date
    let expiryDate = null;
    if (data.expiryDate) {
      expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        expiryDate = null;
      }
    }

    // Insert the product - only using fields that exist in the schema
    const newProduct = await db
      .insert(Products)
      .values({
        Name: data.name,
        Description: data.description || null,
        Sku: data.sku,
        Price: data.price.toFixed(2),
        BasePrice: data.basePrice.toFixed(2),
        profitType: data.profitType,
        profitValue: data.profitValue.toFixed(2),
        creditMarkupType: data.creditMarkupType,
        creditMarkupValue: data.creditMarkupValue?.toFixed(2),
        CreditDueDays: data.creditDueDays,
        CreditPenaltyType: data.creditPenaltyType,
        CreditPenaltyValue: data.creditPenaltyValue?.toFixed(2),
        StockQuantity: (data.stock ?? 0).toString(),
        CategoryId: categoryId,
        Image: data.image || null,
        Supplier: data.supplier || null,
        ExpiryDate: data.expiryDate || null,
        IsActive: true,
        conversionFactor: extras.ConversionFactor ?? extras.conversionFactor ?? undefined,
        parentProductId: extras.ParentProductId ?? extras.parentProductId ?? undefined,
        piecesPerPack: extras.PiecesPerPack ?? extras.piecesPerPack ?? undefined,
        currentPiecesPerPack: extras.currentPiecesPerPack != null ? extras.currentPiecesPerPack : (extras.PiecesPerPack ?? extras.piecesPerPack ?? undefined),
        piecePrice: extras.piecePrice !== undefined ? extras.piecePrice.toFixed(2) : (typeof extras.PiecePrice === 'number' ? extras.PiecePrice.toFixed(2) : undefined),
        pieceUnitName: extras.pieceUnitName ?? extras.PieceUnitName ?? undefined,
      } as any)
      .returning();

    // Format the product for response
    return NextResponse.json({
      status: 'success',
      message: 'Product created successfully',
      product: {
        id: newProduct[0].ProductId,
        name: newProduct[0].Name,
        price: parseFloat(newProduct[0].Price),
        basePrice: parseFloat(newProduct[0].BasePrice),
        profitType: newProduct[0].profitType,
        profitValue: parseFloat(newProduct[0].profitValue),
        creditMarkupType: newProduct[0].creditMarkupType,
        creditMarkupValue: newProduct[0].creditMarkupValue ? parseFloat(newProduct[0].creditMarkupValue) : 0,
        category: data.category,
        sku: newProduct[0].Sku,
        stock: newProduct[0].StockQuantity,
        description: newProduct[0].Description || '',
        supplier: newProduct[0].Supplier || '',
        image: newProduct[0].Image || '',
        expiryDate: newProduct[0].ExpiryDate ? new Date(newProduct[0].ExpiryDate).toISOString() : null,
        isActive: newProduct[0].IsActive,
        conversionFactor: newProduct[0].conversionFactor ?? null,
        parentProductId: newProduct[0].parentProductId ?? null,
        piecesPerPack: newProduct[0].piecesPerPack ?? undefined,
        currentPiecesPerPack: newProduct[0].currentPiecesPerPack ?? undefined,
        piecePrice: newProduct[0].piecePrice ? parseFloat(String(newProduct[0].piecePrice)) : undefined,
        pieceUnitName: newProduct[0].pieceUnitName || undefined,
      }
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    if (error.message.includes('duplicate key value violates unique constraint')) {
      return NextResponse.json({
        status: 'error',
        message: 'A product with this SKU already exists'
      }, { status: 409 });
    }
    
    return NextResponse.json({
      status: 'error',
      message: `Error creating product: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
 