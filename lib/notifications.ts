import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import { EmailService } from './email';
import { db } from '@/db/connection';
import { Products } from '@/db/schema';
import { lt, lte } from 'drizzle-orm';

// Store the socket.io server instance
let io: SocketIOServer | null = null;

// Types of notifications
export type NotificationType = 
  | 'purchase' 
  | 'credit_limit_update' 
  | 'credit_payment' 
  | 'low_stock' 
  | 'expiry_warning'
  | 'credit_penalty_impending';

// Notification data structure
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
  resolved?: boolean; // Add resolved flag to track if issue has been addressed
}

// In-memory store for notifications (would be replaced with DB in production)
const notifications: Notification[] = [];

// Configuration for stock and expiry thresholds
const STOCK_THRESHOLD = 10; // Default threshold for low stock
const EXPIRY_DAYS_THRESHOLD = 14; // Default days threshold for expiring products (2 weeks)

/**
 * Initialize the Socket.IO server
 */
export const InitSocketServer = (res: NextApiResponse) => {
  if (!io) {
    // @ts-ignore - NextApiResponse has necessary properties for Socket.IO
    io = new SocketIOServer(res.socket.server);
    
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      // Send existing notifications to newly connected client
      socket.emit('notifications', notifications);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
      
      // Mark notification as read
      socket.on('mark_read', (notificationId: string) => {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
          notification.read = true;
          io?.emit('notification_updated', notification);
        }
      });
    });
    
    // @ts-ignore - Attach io instance to the response object
    res.socket.server.io = io;
    
    // Start monitoring products for stock and expiry
    startProductMonitoring();
  }
  
  return io;
};

/**
 * Start monitoring products for low stock and expiration
 */
export const startProductMonitoring = () => {
  // Run the check immediately on startup
  checkProductsStockAndExpiry();
  
  // Then set up interval to check periodically (every 1 hour)
  const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  setInterval(checkProductsStockAndExpiry, CHECK_INTERVAL);
};

/**
 * Check products for low stock and expiration
 */
export const checkProductsStockAndExpiry = async () => {
  try {
    console.log('Checking products for low stock and expiration...');
    
    // Calculate the date threshold for expiry warnings
    const expiryThresholdDate = new Date();
    expiryThresholdDate.setDate(expiryThresholdDate.getDate() + EXPIRY_DAYS_THRESHOLD);
    
    // Get all products with low stock or nearing expiry
    const productsData = await db.select().from(Products);
    
    // Check for low stock
    for (const product of productsData) {
      // Skip inactive products
      if (!product.IsActive) continue;
      
          // Check for low stock
          if (parseFloat(product.StockQuantity) <= STOCK_THRESHOLD) {
            await SendLowStockNotification(
              product.ProductId,
              product.Name,
              parseFloat(product.StockQuantity)
            );
          }      
      // Check for expiring products
      if (product.ExpiryDate && new Date(product.ExpiryDate) <= expiryThresholdDate) {
        await SendExpiryWarningNotification(
          product.ProductId,
          product.Name,
          new Date(product.ExpiryDate)
        );
      }
    }
  } catch (error) {
    console.error('Error checking products for stock and expiry:', error);
  }
};

/**
 * Send a notification
 */
export const SendNotification = async (
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>,
  emailRecipient?: { email: string; name: string }
) => {
  // Create a truly unique ID with timestamp and random string
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 11);
  
  // Create notification object
  const notification: Notification = {
    id: `notif_${timestamp}_${randomId}`,
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    resolved: data?.resolved || false,
    data
  };
  
  // Check if a notification with similar data already exists (to prevent duplicates)
  const existingSimilar = notifications.find(n => 
    n.type === type && 
    n.title === title && 
    n.message === message &&
    !n.resolved &&
    Math.abs(new Date(n.timestamp).getTime() - Date.now()) < 5000 // Created within the last 5 seconds
  );
  
  if (existingSimilar) {
    console.log('Prevented duplicate notification:', title);
    return existingSimilar;
  }
  
  // Add to notifications array
  notifications.push(notification);
  
  // Limit array size to prevent memory issues
  if (notifications.length > 100) {
    // Remove oldest read AND resolved notifications first
    const readAndResolvedIndex = notifications.findIndex(n => n.read && n.resolved);
    if (readAndResolvedIndex !== -1) {
      notifications.splice(readAndResolvedIndex, 1);
    } else {
      // If no read and resolved notifications, remove oldest read notification
      const readIndex = notifications.findIndex(n => n.read);
      if (readIndex !== -1) {
        notifications.splice(readIndex, 1);
      } else {
        // If no read notifications, remove oldest notification
        notifications.shift();
      }
    }
  }
  
  // Emit to all connected clients
  io?.emit('new_notification', notification);
  
  // Send email if recipient provided
  if (emailRecipient) {
    try {
      await EmailService.SendMemberNotification(
        emailRecipient.email,
        emailRecipient.name,
        title,
        message
      );
      console.log(`Email notification sent to ${emailRecipient.email}`);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }
  
  return notification;
};

/**
 * Send purchase notification
 */
export const SendPurchaseNotification = async (
  transactionId: number | string,
  memberName: string,
  amount: number,
  items: number
) => {
  return SendNotification(
    'purchase',
    'New Purchase',
    `${memberName} made a purchase of $${amount.toFixed(2)} (${items} items)`,
    { transactionId, memberName, amount, items }
  );
};

/**
 * Send credit limit update notification
 */
export const SendCreditLimitUpdateNotification = async (
  memberId: number,
  memberName: string,
  memberEmail: string,
  oldLimit: number,
  newLimit: number
) => {
  return SendNotification(
    'credit_limit_update',
    'Credit Limit Updated',
    `Credit limit for ${memberName} updated from $${oldLimit.toFixed(2)} to $${newLimit.toFixed(2)}`,
    { memberId, memberName, oldLimit, newLimit },
    { email: memberEmail, name: memberName }
  );
};

/**
 * Send credit payment notification
 */
export const SendCreditPaymentNotification = async (
  memberId: number,
  memberName: string,
  memberEmail: string,
  amount: number,
  newBalance: number
) => {
  return SendNotification(
    'credit_payment',
    'Credit Payment Received',
    `Payment of $${amount.toFixed(2)} received from ${memberName}. New balance: $${newBalance.toFixed(2)}`,
    { memberId, memberName, amount, newBalance },
    { email: memberEmail, name: memberName }
  );
};

/**
 * Send low stock notification
 */
export const SendLowStockNotification = async (
  productId: number,
  productName: string,
  currentStock: number
) => {
  // Check if we already have a notification for this product
  const existingNotification = notifications.find(
    n => n.type === 'low_stock' && 
    n.data?.productId === productId &&
    !n.resolved // Only consider unresolved notifications
  );
  
  if (existingNotification) {
    // Check if the issue has been resolved (stock is now above threshold)
    if (currentStock > STOCK_THRESHOLD) {
      // Mark the existing notification as resolved
      existingNotification.resolved = true;
      existingNotification.message = `Product "${productName}" stock has been replenished (${currentStock} now in stock)`;
      io?.emit('notification_updated', existingNotification);
      console.log(`Resolved low stock notification for ${productName}`);
      
      // Return a new notification indicating the issue is resolved
      return SendNotification(
        'low_stock',
        'Stock Replenished',
        `Product "${productName}" stock has been replenished (${currentStock} now in stock)`,
        { productId, productName, currentStock, resolved: true }
      );
    }
    
    // If stock is still low, update the existing notification with current stock level
    if (existingNotification.data) {
      existingNotification.data.currentStock = currentStock;
      existingNotification.message = `Product "${productName}" is running low on stock (${currentStock} remaining)`;
      existingNotification.timestamp = new Date(); // Update timestamp
      io?.emit('notification_updated', existingNotification);
    }
    
    console.log(`Updated existing low stock notification for ${productName}`);
    return existingNotification;
  }
  
  // Create a new notification for this low stock issue
  return SendNotification(
    'low_stock',
    'Low Stock Alert',
    `Product "${productName}" is running low on stock (${currentStock} remaining)`,
    { productId, productName, currentStock, resolved: false }
  );
};

/**
 * Send expiry warning notification
 */
export const SendExpiryWarningNotification = async (
  productId: number,
  productName: string,
  expiryDate: Date
) => {
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  // Check if we already have a notification for this product
  const existingNotification = notifications.find(
    n => n.type === 'expiry_warning' && 
    n.data?.productId === productId &&
    !n.resolved // Only consider unresolved notifications
  );
  
  if (existingNotification) {
    // Check if the product has expired
    if (daysUntilExpiry <= 0) {
      // Mark the existing notification as resolved but create a new "expired" notification
      existingNotification.resolved = true;
      io?.emit('notification_updated', existingNotification);
      
      // Return a new notification indicating the product has expired
      return SendNotification(
        'expiry_warning',
        'Product Expired',
        `Product "${productName}" has expired (${expiryDate.toLocaleDateString()})`,
        { productId, productName, expiryDate, daysUntilExpiry, expired: true, resolved: true }
      );
    }
    
    // If expiry date is still approaching, update the existing notification
    if (existingNotification.data) {
      existingNotification.data.daysUntilExpiry = daysUntilExpiry;
      existingNotification.message = `Product "${productName}" will expire in ${daysUntilExpiry} days (${expiryDate.toLocaleDateString()})`;
      existingNotification.timestamp = new Date(); // Update timestamp
      io?.emit('notification_updated', existingNotification);
    }
    
    console.log(`Updated existing expiry notification for ${productName}`);
    return existingNotification;
  }
  
  // Create a new notification for this expiry warning
  return SendNotification(
    'expiry_warning',
    'Product Expiry Warning',
    `Product "${productName}" will expire in ${daysUntilExpiry} days (${expiryDate.toLocaleDateString()})`,
    { productId, productName, expiryDate, daysUntilExpiry, resolved: false }
  );
};

/**
 * Get all notifications
 */
export const GetAllNotifications = () => {
  return [...notifications].sort((a, b) => 
    b.timestamp.getTime() - a.timestamp.getTime()
  );
};

/**
 * Get unread notifications count
 */
export const GetUnreadCount = () => {
  return notifications.filter(n => !n.read).length;
};

/**
 * Mark a notification as read
 */
export const MarkNotificationAsRead = (id: string): boolean => {
  const notification = notifications.find(n => n.id === id);
  if (!notification) {
    return false;
  }
  
  notification.read = true;
  io?.emit('notification_updated', notification);
  return true;
};

/**
 * Mark a notification as resolved
 */
export const MarkNotificationAsResolved = (id: string, resolved: boolean = true): boolean => {
  const notification = notifications.find(n => n.id === id);
  if (!notification) {
    return false;
  }
  
  notification.resolved = resolved;
  io?.emit('notification_updated', notification);
  return true;
};


/**
 * Send credit penalty impending notification
 */
export const SendCreditPenaltyImpendingNotification = async (
  memberId: number,
  memberName: string,
  memberEmail: string,
  creditAmount: number,
  daysUntilPenalty: number
) => {
  return SendNotification(
    'credit_penalty_impending',
    'Impending Credit Penalty',
    `Dear ${memberName}, your credit balance of $${creditAmount.toFixed(2)} will incur a penalty in ${daysUntilPenalty} days if not paid.`,
    { memberId, memberName, creditAmount, daysUntilPenalty },
    { email: memberEmail, name: memberName }
  );
};

export async function createAdminNotification(
  title: string,
  message: string,
  link?: string // Optional link for the notification
) {
  return SendNotification(
    'credit_payment', // Using a relevant type
    title,
    message,
    { link } // Pass link in data
  );
}

/**
 * Send payment request notification to admin
 */
export const SendPaymentRequestNotification = async (
  memberId: number,
  memberName: string,
  amount: number
) => {
  return SendNotification(
    'credit_payment',
    'Credit Payment Request',
    `${memberName} has submitted a credit payment request for $${amount.toFixed(2)}`,
    { memberId, memberName, amount, type: 'payment_request' }
  );
};
