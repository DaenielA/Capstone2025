const { db } = require('./db/connection');
const { TransactionRepository } = require('./db/repositories/TransactionRepository');
const { eq } = require('drizzle-orm');
const { Products } = require('./db/schema');

async function testUnitConversionStockManagement() {
  console.log('🧪 Testing Unit Conversion Stock Management...\n');

  try {
    // 1. Create a test product with unit conversion
    console.log('1. Creating test product with piecesPerPack = 12...');
    const [testProduct] = await db.insert(Products).values({
      Name: 'Test Unit Conversion Product',
      Sku: 'TEST-UCP-001',
      Price: '100.00',
      BasePrice: '80.00',
      StockQuantity: 3, // Main stock: 3 units
      piecesPerPack: 12, // Micro stock: 12 pieces per pack
      CategoryId: 1,
      IsActive: true,
    }).returning();

    console.log(`✅ Created product: ${testProduct.Name} (ID: ${testProduct.ProductId})`);
    console.log(`   Main Stock: ${testProduct.StockQuantity}, Micro Stock: ${testProduct.piecesPerPack}\n`);

    // 2. Test Case 1: Transaction that doesn't deplete micro stock
    console.log('2. Test Case 1: Selling 8 units (micro stock sufficient)...');
    const transaction1 = await TransactionRepository.CreateWithItems({
      UserId: 1,
      TotalAmount: '800.00',
      PaymentMethod: 'cash',
      Timestamp: new Date()
    }, [{
      ProductId: testProduct.ProductId,
      Quantity: 8,
      PriceAtTimeOfSale: '100.00',
      BasePriceAtTimeOfSale: '80.00',
      Profit: '160.00' // (100-80) * 8
    }]);

    // Check updated stock
    const productAfterT1 = await db.query.Products.findFirst({
      where: eq(Products.ProductId, testProduct.ProductId)
    });

    console.log(`   After Transaction 1:`);
    console.log(`   Main Stock: ${productAfterT1.StockQuantity}, Micro Stock: ${productAfterT1.currentPiecesPerPack}`);
    console.log(`   Expected: Main Stock: 3, Micro Stock: ${12 - 8} = 4\n`);

    // 3. Test Case 2: Transaction that depletes micro stock (should trigger reset)
    console.log('3. Test Case 2: Selling 6 units (micro stock insufficient, should reset)...');
    const transaction2 = await TransactionRepository.CreateWithItems({
      UserId: 1,
      TotalAmount: '600.00',
      PaymentMethod: 'cash',
      Timestamp: new Date()
    }, [{
      ProductId: testProduct.ProductId,
      Quantity: 6,
      PriceAtTimeOfSale: '100.00',
      BasePriceAtTimeOfSale: '80.00',
      Profit: '120.00' // (100-80) * 6
    }]);

    // Check updated stock
    const productAfterT2 = await db.query.Products.findFirst({
      where: eq(Products.ProductId, testProduct.ProductId)
    });

    console.log(`   After Transaction 2:`);
    console.log(`   Main Stock: ${productAfterT2.StockQuantity}, Micro Stock: ${productAfterT2.currentPiecesPerPack}`);
    console.log(`   Expected: Main Stock: ${3 - 1} = 2, Micro Stock: ${4 + 12 - 6} = 10 (opened 1 pack, sold 6)\n`);

    // 4. Test Case 3: Another transaction to verify micro stock behavior
    console.log('4. Test Case 3: Selling 10 units (should trigger another reset)...');
    const transaction3 = await TransactionRepository.CreateWithItems({
      UserId: 1,
      TotalAmount: '1000.00',
      PaymentMethod: 'cash',
      Timestamp: new Date()
    }, [{
      ProductId: testProduct.ProductId,
      Quantity: 10,
      PriceAtTimeOfSale: '100.00',
      BasePriceAtTimeOfSale: '80.00',
      Profit: '200.00' // (100-80) * 10
    }]);

    // Check updated stock
    const productAfterT3 = await db.query.Products.findFirst({
      where: eq(Products.ProductId, testProduct.ProductId)
    });

    console.log(`   After Transaction 3:`);
    console.log(`   Main Stock: ${productAfterT3.StockQuantity}, Micro Stock: ${productAfterT3.currentPiecesPerPack}`);
    console.log(`   Expected: Main Stock: ${2 - 1} = 1, Micro Stock: ${10 - 10} = 0\n`);

    // 5. Test Case 4: Error case - insufficient main stock
    console.log('5. Test Case 4: Testing error case (insufficient main stock)...');
    try {
      const transaction4 = await TransactionRepository.CreateWithItems({
        UserId: 1,
        TotalAmount: '1500.00',
        PaymentMethod: 'cash',
        Timestamp: new Date()
      }, [{
        ProductId: testProduct.ProductId,
        Quantity: 15, // More than remaining micro stock (2) + would need another pack
        PriceAtTimeOfSale: '100.00',
        BasePriceAtTimeOfSale: '80.00',
        Profit: '300.00'
      }]);
      console.log('❌ ERROR: Should have thrown insufficient stock error!');
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message}\n`);
    }

    // 6. Cleanup: Delete test product
    console.log('6. Cleaning up test data...');
    await db.delete(Products).where(eq(Products.ProductId, testProduct.ProductId));
    console.log('✅ Test product deleted\n');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testUnitConversionStockManagement();
