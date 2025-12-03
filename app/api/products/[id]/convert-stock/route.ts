import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/connection";
import { Products, PackOpeningLogs, InventoryLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GetCurrentSession } from "@/lib/auth";


/**
 * POST handler for converting 1 unit of main stock to micro stock
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await GetCurrentSession();
    if (!session || !session.UserId) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }
    const userId = parseInt(session.UserId);

    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid product ID" },
        { status: 400 }
      );
    }

    // Get the current product
    const product = await db.query.Products.findFirst({
      where: eq(Products.ProductId, productId),
    });

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product has piecesPerPack configured
    if (!product.piecesPerPack || product.piecesPerPack <= 0) {
      return NextResponse.json(
        { status: "error", message: "Product does not have pieces per pack configured" },
        { status: 400 }
      );
    }

    // Check if there's enough main stock to convert
    const currentMainStock = Number(product.StockQuantity);
    if (currentMainStock < 1) {
      return NextResponse.json(
        { status: "error", message: "Insufficient main stock to convert" },
        { status: 400 }
      );
    }

    // Calculate new stock levels
    const newMainStock = currentMainStock - 1;
    const piecesToAdd = Number(product.piecesPerPack);
    const currentMicroStock = product.currentPiecesPerPack ? Number(product.currentPiecesPerPack) : 0;
    const newMicroStock = currentMicroStock + piecesToAdd;

    // Update the product stock
    const [updated] = await db
      .update(Products)
      .set({
        StockQuantity: newMainStock.toString(),
        currentPiecesPerPack: newMicroStock.toString(),
        UpdatedAt: new Date(),
      })
      .where(eq(Products.ProductId, productId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { status: "error", message: "Failed to update product stock" },
        { status: 500 }
      );
    }

    // Log the pack opening event (similar to automatic conversion)
    await db.insert(PackOpeningLogs).values({
      packProductId: productId,
      pieceProductId: productId,
      quantityOpened: 1,
      piecesAdded: piecesToAdd,
      openedAt: new Date(),
      triggeredByTransactionId: null, // Manual conversion, no transaction
      triggeredByUserId: userId,
    });

    // Log the inventory activity
    await db.insert(InventoryLogs).values({
      ProductId: productId,
      Action: "Stock Conversion",
      Details: `User #${userId} converted 1 pack of ${product.Name} to ${piecesToAdd} pieces. Main stock: ${currentMainStock} → ${newMainStock}, Micro stock: ${currentMicroStock} → ${newMicroStock}`,
      UserId: userId,
      Timestamp: new Date(),
    });


    // Format the response
    const formattedProduct = {
      id: updated.ProductId,
      name: updated.Name,
      stock: updated.StockQuantity,
      currentPiecesPerPack: updated.currentPiecesPerPack,
      piecesPerPack: updated.piecesPerPack,
    };

    return NextResponse.json({
      status: "success",
      message: `Successfully converted 1 pack to ${piecesToAdd} pieces`,
      product: formattedProduct
    });

  } catch (error: any) {
    console.error("Error converting stock:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to convert stock" },
      { status: 500 }
    );
  }
}
