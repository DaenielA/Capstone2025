import { NextResponse } from 'next/server';
import { CategoryRepository } from '@/db/repositories/CategoryRepository';
import { db } from '@/db/connection';
import { Products, Categories } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET handler for retrieving all products
 */

//interface for category


export async function GET(request: Request) {
  try {
    // Check if we should return only low stock products
    const { searchParams } = new URL(request.url);
    const lowStock = searchParams.get('low_stock');
    const threshold = searchParams.get('threshold');
    
    let categories;
 
    categories = await CategoryRepository.GetAllCategory();
    
    
    // Format the response to match the frontend model
    const formattedProducts = categories.map((item) => {
      const id = item.CategoryId || item;
      const description = item.Description || null;
      const name = item.Name || null;
      const updatedAt = item.UpdatedAt || null;
      const createdAt = item.CreatedAt || null;
      
      return {
        id: id,
        description: description,
        name: name,
        updatedAt: updatedAt ? new Date(updatedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }) : new Date().toLocaleDateString('en-US', {
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        createdAt: createdAt ? new Date(createdAt).toLocaleDateString('en-US', {  
  
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }) : new Date().toLocaleDateString('en-US', {
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })

      };
    });
    
    return NextResponse.json({
      status: 'success',
      categories: formattedProducts
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    
    return NextResponse.json({
      status: 'error',
      message: `Error fetching products: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
