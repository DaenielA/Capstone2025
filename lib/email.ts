/**
 * Email Service
 * This module provides email functionality for the application
 */
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import handlebars from 'handlebars';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@pandol.com';
const FROM_NAME = process.env.FROM_NAME || 'Pandol System';

// Create reusable transporter object
const Transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  // For development/testing - don't use in production
  ...(process.env.NODE_ENV !== 'production' && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
});

// Read file promise
const readFile = promisify(fs.readFile);

/**
 * Get email template
 * @param templateName - Name of the template
 * @returns Template string
 */
const GetTemplate = async (templateName: string): Promise<string> => {
  try {
    const templatePath = path.join(process.cwd(), 'emails', `${templateName}.html`);
    const template = await readFile(templatePath, 'utf-8');
    return template;
  } catch (error) {
    console.error(`Error loading email template ${templateName}:`, error);
    throw new Error(`Email template not found: ${templateName}`);
  }
};

/**
 * Send an email
 * @param to - Recipient email
 * @param subject - Email subject
 * @param template - Template name (without .html extension)
 * @param data - Template data
 * @returns Promise with send info
 */
const SendEmail = async (
  to: string | string[],
  subject: string,
  template: string,
  data: Record<string, any> = {}
) => {
  try {
    console.log(`[EMAIL SERVICE] Beginning email process - Template: ${template}, Subject: ${subject}`);
    console.log(`[EMAIL SERVICE] Recipients: ${typeof to === 'string' ? to : to.join(', ')}`);
    
    // Get template
    console.log(`[EMAIL SERVICE] Loading email template: ${template}.html`);
    const templateLoadStart = Date.now();
    const templateContent = await GetTemplate(template);
    console.log(`[EMAIL SERVICE] Template loaded (${templateContent.length} bytes) in ${Date.now() - templateLoadStart}ms`);
    
    // Compile template with Handlebars
    console.log(`[EMAIL SERVICE] Compiling template with Handlebars...`);
    const compileStart = Date.now();
    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate(data);
    console.log(`[EMAIL SERVICE] Template compiled in ${Date.now() - compileStart}ms`);

    // Send email
    const mailOptions = {
      from: {
        name: FROM_NAME,
        address: FROM_EMAIL,
      },
      to,
      subject,
      html,
      // Plain text version
      text: html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    };

    console.log(`[EMAIL SERVICE] Sending email with options: From=${FROM_NAME} <${FROM_EMAIL}>, Subject="${subject}"`);
    console.log(`[EMAIL SERVICE] SMTP Configuration: Host=${SMTP_HOST}, Port=${SMTP_PORT}, User=${SMTP_USER}`);

    // Send mail
    const sendStart = Date.now();
    const info = await Transporter.sendMail(mailOptions);
    const sendDuration = Date.now() - sendStart;
    
    console.log(`[EMAIL SERVICE] Email sent successfully in ${sendDuration}ms`);
    console.log(`[EMAIL SERVICE] Email ID: ${info.messageId}`);
    console.log(`[EMAIL SERVICE] SMTP Response: ${info.response}`);
    return info;
  } catch (error) {
    console.error('[EMAIL SERVICE ERROR] Failed to send email:', error);
    
    // Check if we're in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('[EMAIL SERVICE] Development mode detected - simulating email send');
      console.log('[EMAIL SERVICE] Email would have been sent with:', {
        to,
        subject,
        template,
        data,
      });
      
      // Return mock successful response for development
      const mockId = `dev-mode-${Date.now()}`;
      console.log(`[EMAIL SERVICE] Mock email sent with ID: ${mockId}`);
      return {
        messageId: mockId,
        response: 'Mock success response (development mode)',
      };
    }
    
    throw error;
  }
};

/**
 * Send welcome email to a new user
 * @param userEmail - User's email address
 * @param userName - User's name
 * @param role - User's role
 */
const SendWelcomeEmail = async (userEmail: string, userName: string, role: string) => {
  return SendEmail(
    userEmail,
    'Welcome to Pandol!',
    'welcome',
    {
      userName,
      role,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`,
      currentYear: new Date().getFullYear(),
    }
  );
};

/**
 * Send password reset email
 * @param userEmail - User's email address
 * @param userName - User's name 
 * @param resetToken - Reset token
 */
const SendPasswordResetEmail = async (userEmail: string, userName: string, resetToken: string) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/reset-password?token=${resetToken}`;
  
  return SendEmail(
    userEmail,
    'Reset Your Password',
    'password-reset',
    {
      userName,
      resetUrl,
      expiresIn: '1 hour',
      currentYear: new Date().getFullYear(),
    }
  );
};

/**
 * Send a receipt email for a transaction
 * @param customerEmail - Customer email
 * @param customerName - Customer name
 * @param receiptData - Receipt data including transaction info, products, etc.
 */
const SendReceiptEmail = async (
  customerEmail: string, 
  customerName: string, 
  receiptData: {
    transactionId: string | number;
    date: string;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    paymentMethod: string;
    cashier: string;
    subtotal: number;
    tax?: number;
    discount?: number;
    amountReceived?: number;
    change?: number;
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
  }
) => {
  return SendEmail(
    customerEmail,
    `Receipt for your purchase #${receiptData.transactionId}`,
    'receipt',
    {
      customerName,
      ...receiptData,
      currentYear: new Date().getFullYear(),
    }
  );
};

/**
 * Send a notification email to member
 * @param memberEmail - Member's email
 * @param memberName - Member's name
 * @param subject - Email subject
 * @param message - Email message
 * @param actionUrl - Optional action URL
 * @param actionText - Optional action button text
 */
const SendMemberNotification = async (
  memberEmail: string,
  memberName: string,
  subject: string,
  message: string,
  actionUrl?: string,
  actionText?: string
) => {
  return SendEmail(
    memberEmail,
    subject,
    'notification',
    {
      memberName,
      message,
      subject,
      actionUrl,
      actionText,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/login`,
      currentYear: new Date().getFullYear(),
    }
  );
};

/**
 * Send a contact form submission
 * @param name - Sender name
 * @param email - Sender email
 * @param subject - Email subject
 * @param message - Email message
 */
const SendContactFormEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string
) => {
  // Send to admin
  return SendEmail(
    process.env.ADMIN_EMAIL || 'admin@pandol.com',
    `Contact Form: ${subject}`,
    'contact-form',
    {
      name,
      email,
      subject,
      message,
      currentYear: new Date().getFullYear(),
    }
  );
};

/**
 * Send account verification email to a member
 * @param memberEmail - Member's email address
 * @param memberName - Member's name
 * @param verificationToken - Verification token
 */
const SendAccountVerificationEmail = async (
  memberEmail: string,
  memberName: string,
  verificationToken: string
) => {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/verify-account?token=${verificationToken}`;
  
  return SendEmail(
    memberEmail,
    'Verify Your Pandol Account',
    'account-verification',
    {
      memberName,
      verificationUrl,
      currentYear: new Date().getFullYear(),
    }
  );
};

// Export functions
export const EmailService = {
  SendEmail,
  SendWelcomeEmail,
  SendPasswordResetEmail,
  SendReceiptEmail,
  SendMemberNotification,
  SendContactFormEmail,
  SendAccountVerificationEmail,
};

export default EmailService; 