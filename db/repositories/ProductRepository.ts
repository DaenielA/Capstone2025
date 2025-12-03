import { db } from '../connection';
import { Products, Categories, productsRelations, PackOpeningLogs, Users } from '../schema';
import { eq, and, lte } from 'drizzle-orm';

/**
 * Repository for Product data access
 */
export class ProductRepository {
  /**
   * Get all products
   */
  static async GetAll() {
    try {
      return await db.select()
        .from(Products)
        .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId));
    } catch (error) {
      console.error('Error getting all products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  static async GetByCategory(categoryId: number) {
    try {
      return await db.select()
        .from(Products)
        .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
        .where(eq(Products.CategoryId, categoryId));
    } catch (error) {
      console.error(`Error getting products for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get a product by ID
   */
  static async GetById(productId: number, tx?: any) {
    try {
      const executor = tx ?? db;
      const results = await executor.select()
        .from(Products)
        .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
        .where(eq(Products.ProductId, productId));
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error getting product by ID ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get a product by SKU
   */
  static async GetBySku(sku: string) {
    try {
      const results = await db.select()
        .from(Products)
        .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
        .where(eq(Products.Sku, sku));
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error getting product by SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  static async Create(productData: {
    Name: string;
    Description?: string;
    Sku: string;
    Price: string;
    MarkupPercentage?: string;
    StockQuantity: number;
    CategoryId: number;
    ExpiryDate?: Date;
    Image?: string;
    Supplier?: string;
  }) {
    try {
      // Convert numeric fields to string for Drizzle's decimal columns
      const insertPayload: any = { ...productData };
      if (insertPayload.StockQuantity != null) {
        insertPayload.StockQuantity = insertPayload.StockQuantity.toString();
      }

      const results = await db.insert(Products)
        .values(insertPayload)
        .returning();
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  static async Update(productId: number, productData: Partial<{
    Name: string;
    Description: string;
    Sku: string;
    Price: string;
    MarkupPercentage?: string;
    StockQuantity: number;
    CategoryId: number;
    ExpiryDate: Date | null;
    Image: string;
    Supplier: string;
    IsActive: boolean;
  }>) {
    try {
      // Convert numeric fields to string for Drizzle's decimal columns
      const updatePayload: any = { ...productData };
      if (updatePayload.StockQuantity != null) {
        updatePayload.StockQuantity = updatePayload.StockQuantity.toString();
      }

      const results = await db.update(Products)
        .set(updatePayload)
        .where(eq(Products.ProductId, productId))
        .returning();
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error updating product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Archive a product instead of deleting it
   */
  static async Archive(productId: number) {
    try {
      const results = await db.update(Products)
        .set({ 
          IsActive: false,
          UpdatedAt: new Date()
        })
        .where(eq(Products.ProductId, productId))
        .returning();
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error archiving product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Reactivate an archived product
   */
  static async Activate(productId: number) {
    try {
      const results = await db.update(Products)
        .set({ 
          IsActive: true,
          UpdatedAt: new Date()
        })
        .where(eq(Products.ProductId, productId))
        .returning();
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error activating product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  static async Delete(productId: number) {
    try {
      const results = await db.delete(Products)
        .where(eq(Products.ProductId, productId))
        .returning();
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error deleting product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Update product stock
   */
  static async UpdateStock(productId: number, newQuantity: number, tx?: any) {
    try {
      const executor = tx ?? db;
      const results = await executor.update(Products)
        .set({ StockQuantity: newQuantity.toString() })
        .where(eq(Products.ProductId, productId))
        .returning();

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`Error updating stock for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Decrement product stock. This is safer for sales operations.
   * It checks for sufficient stock before decrementing.
   */
  static async DecrementStock(productId: number, quantityToDecrement: number, tx?: any) {
    try {
      const executor = tx ?? db;
      
      // It's often better to handle this logic within a transaction at the service layer
      // to prevent race conditions. This implementation is a safeguard.
      const product = await this.GetById(productId, executor);

      if (!product) {
        throw new Error(`Product with ID ${productId} not found.`);
      }

      if (product.StockQuantity < quantityToDecrement) {
        throw new Error(`Insufficient stock for product ${product.Name}.`);
      }

      const newQuantity = product.StockQuantity - quantityToDecrement;
      return this.UpdateStock(productId, newQuantity, executor);
    } catch (error) {
      console.error(`Error decrementing stock for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  static async GetLowStock(threshold: number = 10, includeArchived: boolean = false) {
    try {
      return await db.select()
        .from(Products)
        .leftJoin(Categories, eq(Products.CategoryId, Categories.CategoryId))
        .where(
          and(
            lte(Products.StockQuantity, threshold.toString()),
            includeArchived ? undefined : eq(Products.IsActive, true)
          )
        );
    } catch (error) {
      console.error(`Error getting low stock products:`, error);
      throw error;
    }
  }

  /**
   * Finds all "piece" products that belong to a specific "pack" product.
   * This uses the relational query API.
   * @param packProductId The ID of the parent "pack" product.
   */
  static async GetPiecesForPack_Relational(packProductId: number) {
    try {
      // Find the parent product (the "pack")...
      const pack = await db.query.Products.findFirst({
        where: eq(Products.ProductId, packProductId),
        // ...and eagerly load its related "ChildProducts" (the "pieces").
        with: {
          ChildProducts: true,
        },
      });

      // Return the array of child products, or an empty array if the pack wasn't found.
      return pack?.ChildProducts || [];
    } catch (error) {
      console.error(`Error getting pieces for pack ${packProductId}:`, error);
      throw error;
    }
  }

  /**
   * Finds all "piece" products using a direct query.
   * This uses the SQL-like query builder.
   * @param packProductId The ID of the parent "pack" product.
   */
  static async GetPiecesForPack_Direct(packProductId: number) {
    // Select all products where the parentProductId matches the given pack ID.
    return await db.select().from(Products).where(eq(Products.parentProductId, packProductId));
  }

  /**
   * Generates a report of all "pack opening" events for inventory tracking.
   */
  static async GetPackOpeningReport() {
    try {
      const logs = await db.query.PackOpeningLogs.findMany({
        with: {
          PackProduct: {
            columns: {
              Name: true,
              Sku: true,
            }
          },
          PieceProduct: {
            columns: {
              Name: true,
              Sku: true,
            }
          },
          User: {
            columns: {
              Name: true,
            }
          },
        },
        orderBy: (logs, { desc }: { desc: (col: any) => any }) => [desc(logs.openedAt)],
      });

      return logs;

    } catch (error) {
      console.error(`Error generating pack opening report:`, error);
      throw error;
    }
  }
} 