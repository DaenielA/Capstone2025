// Inventory Management Constants
export const INVENTORY_CONSTANTS = {
  LOW_STOCK_THRESHOLD: 15,
  NOTIFICATION_INTERVAL: 5000,
  EXPIRY_WARNING_DAYS: 30,
} as const;

// Stock Status Configurations
export const STOCK_STATUS = {
  LOW: {
    color: 'text-red-500',
    badge: 'Low',
    bgColor: 'bg-red-100',
    indicator: 'bg-red-500'
  },
  NORMAL: {
    color: 'text-green-500',
    badge: null,
    bgColor: 'bg-green-100',
    indicator: 'bg-green-500'
  },
} as const;

// Product Status Priorities (for sorting)
export const PRODUCT_STATUS_PRIORITIES = {
  EXPIRED: 0,
  EXPIRING_SOON: 1,
  ACTIVE: 2,
  ARCHIVED: 3,
} as const;

// Product Status Configurations
export const PRODUCT_STATUS_CONFIG = {
  ARCHIVED: {
    label: "Archived",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    priority: PRODUCT_STATUS_PRIORITIES.ARCHIVED,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-red-50 text-red-600 border-red-200",
    priority: PRODUCT_STATUS_PRIORITIES.EXPIRED,
  },
  EXPIRING_SOON: {
    label: "Expiring Soon",
    color: "bg-amber-50 text-amber-600 border-amber-200",
    priority: PRODUCT_STATUS_PRIORITIES.EXPIRING_SOON,
  },
  ACTIVE: {
    label: "Active",
    color: "bg-green-50 text-green-600 border-green-200",
    priority: PRODUCT_STATUS_PRIORITIES.ACTIVE,
  },
} as const;
