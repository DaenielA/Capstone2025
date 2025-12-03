import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/connection";
import { Products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = parseInt(params.id, 10);

    if (isNaN(productId)) {
      return NextResponse.json(
        { status: "error", message: "Invalid product ID" },
        { status: 400 }
      );
    }

    const [activatedProduct] = await db
      .update(Products)
      .set({ IsActive: true, UpdatedAt: new Date() })
      .where(eq(Products.ProductId, productId))
      .returning();

    if (!activatedProduct) {
      return NextResponse.json(
        { status: "error", message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Product activated successfully",
      product: activatedProduct,
    });
  } catch (error: any) {
    console.error("Error activating product:", error);
    return NextResponse.json(
      { status: "error", message: "Internal Server Error" },
      { status: 500 }
    );
  }
}