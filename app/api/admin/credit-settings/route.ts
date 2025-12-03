import { NextRequest, NextResponse } from 'next/server';
import { CreditRepository } from '@/db/repositories/CreditRepository';

/**
 * GET handler for retrieving credit settings
 */
export async function GET() {
  try {
    const settings = await CreditRepository.getCreditSettings();

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        settings: {
          SettingId: null,
          InterestRate: '1.50',
          GracePeriodDays: 30,
          LateFeeAmount: '50.00',
          LateFeePercentage: '2.00',
          defaultMarkupPercentage: '5.00',
          creditDueDays: 30,
          creditPenaltyType: 'fixed',
          creditPenaltyValue: '0.00',
          CreatedAt: new Date().toISOString(),
          UpdatedAt: new Date().toISOString(),
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error: any) {
    console.error('Error retrieving credit settings:', error);

    return NextResponse.json({
      success: false,
      message: `Error retrieving credit settings: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}

/**
 * POST handler for updating credit settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['InterestRate', 'GracePeriodDays', 'LateFeeAmount', 'LateFeePercentage', 'defaultMarkupPercentage', 'creditDueDays', 'creditPenaltyType', 'creditPenaltyValue'];
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json({
          success: false,
          message: `Missing required field: ${field}`
        }, { status: 400 });
      }
    }

    // Validate numeric fields
    const numericFields = ['InterestRate', 'GracePeriodDays', 'LateFeeAmount', 'LateFeePercentage', 'defaultMarkupPercentage', 'creditDueDays', 'creditPenaltyValue'];
    for (const field of numericFields) {
      // creditPenaltyType is not numeric, so we skip it here
      if (field === 'creditPenaltyType') continue; 
      const value = parseFloat(body[field]);
      if (isNaN(value) || value < 0) {
        return NextResponse.json({
          success: false,
          message: `Invalid value for ${field}: must be a positive number`
        }, { status: 400 });
      }
    }

    // Validate creditPenaltyType
    if (!['fixed', 'percentage'].includes(body.creditPenaltyType)) {
      return NextResponse.json({
        success: false,
        message: `Invalid value for creditPenaltyType: must be 'fixed' or 'percentage'`
      }, { status: 400 });
    }

    // Prepare settings data
    const settingsData = {
      InterestRate: body.InterestRate.toString(),
      GracePeriodDays: parseInt(body.GracePeriodDays),
      LateFeeAmount: body.LateFeeAmount.toString(),
      LateFeePercentage: body.LateFeePercentage.toString(),
      defaultMarkupPercentage: body.defaultMarkupPercentage.toString(),
      creditDueDays: parseInt(body.creditDueDays),
      creditPenaltyType: body.creditPenaltyType,
      creditPenaltyValue: body.creditPenaltyValue.toString(),
    };

    const updatedSettings = await CreditRepository.updateCreditSettings(settingsData);

    return NextResponse.json({
      success: true,
      message: 'Credit settings updated successfully',
      settings: updatedSettings[0] || settingsData
    });

  } catch (error: any) {
    console.error('Error updating credit settings:', error);

    return NextResponse.json({
      success: false,
      message: `Error updating credit settings: ${error.message || 'Unknown error'}`
    }, { status: 500 });
  }
}
