import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { Products, CreditSettings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

interface CartItem {
  productId: number;
  quantity: number;
  price: number;
}


/**
 * POST handler for calculating credit markup on a transaction.
 * Expects a body with { items: CartItem[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cartItems: CartItem[] = body.items;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({
        subtotal: 0,
        totalMarkupAmount: 0,
        grandTotal: 0,
      });
    }

    const productIds = cartItems.map(item => item.productId);

    // Fetch all products in the cart in a single query
    const productsInCart = await db.query.Products.findMany({
      where: inArray(Products.ProductId, productIds),
      columns: {
        ProductId: true,
        Price: true,
        creditMarkupType: true,
        creditMarkupValue: true,
      },
    });

    // Fetch default credit settings
    const creditSettings = await db.query.CreditSettings.findFirst();
    const defaultMarkupPercentage = creditSettings ? parseFloat(String((creditSettings as any).defaultMarkupPercentage ?? (creditSettings as any).DefaultMarkupPercentage ?? 0)) : 0;

    let subtotal = 0;
    let totalMarkupAmount = 0;

    for (const item of cartItems) {
      const product = productsInCart.find(p => p.ProductId === item.productId);
      if (!product) {
        // Or handle as an error, e.g., throw new Error(`Product with ID ${item.productId} not found`);
        continue;
      }

      const itemPrice = item.price;
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;


      let itemMarkup = 0;
      if (product.creditMarkupType === 'percentage' && product.creditMarkupValue) {
        itemMarkup = itemSubtotal * (parseFloat(product.creditMarkupValue) / 100);
      } else if (product.creditMarkupType === 'fixed' && product.creditMarkupValue) {
        itemMarkup = parseFloat(product.creditMarkupValue) * item.quantity;
      } else {
        // Fallback to default markup if product-specific one doesn't exist
        itemMarkup = itemSubtotal * (defaultMarkupPercentage / 100);
      }
      totalMarkupAmount += itemMarkup;
    }

    const grandTotal = subtotal + totalMarkupAmount;

    return NextResponse.json({
      success: true,
      subtotal: subtotal.toFixed(2),
      totalMarkupAmount: totalMarkupAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
    });

  } catch (error: any) {
    console.error(`Error calculating credit markup:`, error);

    return NextResponse.json({
      success: false,
      message: `Error calculating credit markup: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
