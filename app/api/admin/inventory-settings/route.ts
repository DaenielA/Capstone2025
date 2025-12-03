import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/db/repositories/InventoryRepository';

/**
 * GET handler for retrieving inventory settings
 */
export async function GET() {
  try {
    const settings = await InventoryRepository.getInventorySettings();

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        settings: {
          SettingId: null,
          LowStockThreshold: 10,
          ExpiryWarningDays: 30,
          NotificationInterval: 5000,
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error: any) {
    console.error('Error retrieving inventory settings:', error);

    return NextResponse.json({
      success: false,
      message: `Error retrieving inventory settings: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * POST handler for updating inventory settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (body.LowStockThreshold === undefined || body.LowStockThreshold < 0) {
      return NextResponse.json({
        success: false,
        message: 'Low stock threshold must be a non-negative number'
      }, { status: 400 });
    }

    if (body.ExpiryWarningDays === undefined || body.ExpiryWarningDays < 0) {
      return NextResponse.json({
        success: false,
        message: 'Expiry warning days must be a non-negative number'
      }, { status: 400 });
    }

    if (body.NotificationInterval === undefined || body.NotificationInterval < 1000) {
      return NextResponse.json({
        success: false,
        message: 'Notification interval must be at least 1000ms'
      }, { status: 400 });
    }

    // Prepare settings data
    const settingsData = {
      LowStockThreshold: parseInt(body.LowStockThreshold),
      ExpiryWarningDays: parseInt(body.ExpiryWarningDays),
      NotificationInterval: parseInt(body.NotificationInterval)
    };

    const updatedSettings = await InventoryRepository.updateInventorySettings(settingsData);

    return NextResponse.json({
      success: true,
      message: 'Inventory settings updated successfully',
      settings: updatedSettings[0] || settingsData
    });
  } catch (error: any) {
    console.error('Error updating inventory settings:', error);

    return NextResponse.json({
      success: false,
      message: `Error updating inventory settings: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
