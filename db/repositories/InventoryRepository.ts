import { db } from '@/db/connection';
import { InventorySettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class InventoryRepository {
  /**
   * Get inventory settings, creating default settings if none exist
   */
  static async getInventorySettings() {
    try {
      const settings = await db.select().from(InventorySettings).limit(1);

      if (settings.length === 0) {
        // Create default settings
        const defaultSettings = await db.insert(InventorySettings).values({
          LowStockThreshold: 10,
          ExpiryWarningDays: 30,
          NotificationInterval: 5000,
        }).returning();

        return defaultSettings[0];
      }

      return settings[0];
    } catch (error) {
      console.error('Error getting inventory settings:', error);
      throw error;
    }
  }

  /**
   * Update inventory settings
   */
  static async updateInventorySettings(settings: {
    LowStockThreshold: number;
    ExpiryWarningDays: number;
    NotificationInterval: number;
  }) {
    try {
      // First, check if settings exist
      const existingSettings = await db.select().from(InventorySettings).limit(1);

      if (existingSettings.length === 0) {
        // Create new settings
        const newSettings = await db.insert(InventorySettings).values({
          ...settings,
          UpdatedAt: new Date(),
        }).returning();

        return newSettings;
      } else {
        // Update existing settings
        const updatedSettings = await db
          .update(InventorySettings)
          .set({
            ...settings,
            UpdatedAt: new Date(),
          })
          .where(eq(InventorySettings.SettingId, existingSettings[0].SettingId))
          .returning();

        return updatedSettings;
      }
    } catch (error) {
      console.error('Error updating inventory settings:', error);
      throw error;
    }
  }

  /**
   * Get low stock threshold value
   */
  static async getLowStockThreshold(): Promise<number> {
    try {
      const settings = await this.getInventorySettings();
      return settings.LowStockThreshold;
    } catch (error) {
      console.error('Error getting low stock threshold:', error);
      return 10; // Default fallback
    }
  }

  /**
   * Get expiry warning days value
   */
  static async getExpiryWarningDays(): Promise<number> {
    try {
      const settings = await this.getInventorySettings();
      return settings.ExpiryWarningDays;
    } catch (error) {
      console.error('Error getting expiry warning days:', error);
      return 30; // Default fallback
    }
  }

  /**
   * Get notification interval value
   */
  static async getNotificationInterval(): Promise<number> {
    try {
      const settings = await this.getInventorySettings();
      return settings.NotificationInterval;
    } catch (error) {
      console.error('Error getting notification interval:', error);
      return 5000; // Default fallback
    }
  }
}
