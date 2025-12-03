import { pgTable, serial, varchar, text, integer, timestamp, decimal, uniqueIndex, foreignKey, primaryKey, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums (if applicable, e.g., for Credit Type)
export const CreditTypeEnum = pgEnum('CreditType', ['Earned', 'Spent', 'Adjustment', 'Payment']);
export const EventTypeEnum = pgEnum('EventType', ['Operation', 'Community', 'Management']);
export const ProfitTypeEnum = pgEnum('ProfitType', ['percentage', 'fixed']);
export const CreditMarkupTypeEnum = pgEnum('CreditMarkupType', ['percentage', 'fixed']);
export const PaymentRequestStatusEnum = pgEnum('PaymentRequestStatus', ['pending', 'approved', 'rejected']);
export const CreditStatusEnum = pgEnum('CreditStatus', ['pending', 'partially_paid', 'fully_paid']);


export const Roles = pgTable('Roles', {
  RoleId: serial('RoleId').primaryKey(),
  Name: varchar('Name', { length: 50 }).notNull().unique(),
  Description: text('Description'),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const Users = pgTable('Users', {
  UserId: serial('UserId').primaryKey(),
  Name: varchar('Name', { length: 255 }).notNull(),
  Email: varchar('Email', { length: 255 }).notNull().unique(),
  PasswordHash: varchar('PasswordHash', { length: 255 }).notNull(), // Store hashed passwords only!
  RoleId: integer('RoleId').notNull().references(() => Roles.RoleId),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
  IsActive: boolean('IsActive').default(true).notNull(),
});

export const usersRelations = relations(Users, ({ one }) => ({
  Role: one(Roles, {
    fields: [Users.RoleId],
    references: [Roles.RoleId],
  }),
  Member: one(Members, {
    fields: [Users.UserId],
    references: [Members.UserId],
  }),
}));


export const Members = pgTable('Members', {
  MemberId: serial('MemberId').primaryKey(),
  Name: varchar('Name', { length: 255 }).notNull(),
  Email: varchar('Email', { length: 255 }).notNull().unique(),
  Phone: varchar('Phone', { length: 50 }),
  Address: text('Address'),
  CreditBalance: decimal('CreditBalance', { precision: 10, scale: 2 }).default('0.00').notNull(),
  CreditLimit: decimal('CreditLimit', { precision: 10, scale: 2 }).default('0.00').notNull(),
  UserId: integer('UserId'),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
  Status: varchar('Status', { length: 50 }).default('active').notNull(), // e.g., 'active', 'inactive', 'suspended'
}, (table) => {
  return {
    userFk: foreignKey({ columns: [table.UserId], foreignColumns: [Users.UserId] }),
  };
});

export const membersRelations = relations(Members, ({ one, many }) => ({
  User: one(Users, { fields: [Members.UserId], references: [Users.UserId] }),
  Transactions: many(Transactions),
  MemberActivities: many(MemberActivities),
  Credits: many(Credits),
  PaymentSchedules: many(PaymentSchedule),
}));



export const CreditSettings = pgTable('CreditSettings', {
    SettingId: serial('SettingId').primaryKey(),
    InterestRate: decimal('InterestRate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    GracePeriodDays: integer('GracePeriodDays').default(30).notNull(),
    LateFeeAmount: decimal('LateFeeAmount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    LateFeePercentage: decimal('LateFeePercentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
      defaultMarkupPercentage: decimal('DefaultMarkupPercentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
      creditDueDays: integer('CreditDueDays').default(30),
      creditPenaltyType: CreditMarkupTypeEnum('CreditPenaltyType'),
      creditPenaltyValue: decimal('CreditPenaltyValue', { precision: 10, scale: 2 }).default('0.00'),
      CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),    UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const InventorySettings = pgTable('InventorySettings', {
    SettingId: serial('SettingId').primaryKey(),
    LowStockThreshold: integer('LowStockThreshold').default(10).notNull(),
    ExpiryWarningDays: integer('ExpiryWarningDays').default(30).notNull(),
    NotificationInterval: integer('NotificationInterval').default(5000).notNull(),
    CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
    UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});


export const PaymentSchedule = pgTable('PaymentSchedule', {
    ScheduleId: serial('ScheduleId').primaryKey(),
    MemberId: integer('MemberId').notNull().references(() => Members.MemberId),
    TransactionId: integer('TransactionId').references(() => Transactions.TransactionId),
    CreditId: integer('CreditId').references(() => Credits.CreditId),
    Amount: decimal('Amount', { precision: 10, scale: 2 }).notNull(),
    PaidAmount: decimal('PaidAmount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    DueDate: timestamp('DueDate', { withTimezone: true }).notNull(),
    Status: varchar('Status', { length: 50 }).default('pending').notNull(), // 'pending', 'paid', 'overdue'
    InstallmentNumber: integer('InstallmentNumber'),
    TotalInstallments: integer('TotalInstallments'),
    CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
    UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const paymentScheduleRelations = relations(PaymentSchedule, ({ one }) => ({
    Member: one(Members, {
      fields: [PaymentSchedule.MemberId],
      references: [Members.MemberId],
    }),
    Transaction: one(Transactions, {
      fields: [PaymentSchedule.TransactionId],
      references: [Transactions.TransactionId],
    }),
    Credit: one(Credits, {
      fields: [PaymentSchedule.CreditId],
      references: [Credits.CreditId],
    }),
}));



// Verification tokens for account creation and password reset
export const VerificationTokens = pgTable('VerificationTokens', {
  TokenId: serial('TokenId').primaryKey(),
  Token: varchar('Token', { length: 255 }).notNull().unique(),
  Type: varchar('Type', { length: 50 }).notNull(), // 'account-verification', 'password-reset', etc.
  MemberId: integer('MemberId').references(() => Members.MemberId),
  UserId: integer('UserId').references(() => Users.UserId),
  ExpiresAt: timestamp('ExpiresAt', { withTimezone: true }).notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UsedAt: timestamp('UsedAt', { withTimezone: true }),
});

export const Categories = pgTable('Categories', {
  CategoryId: serial('CategoryId').primaryKey(),
  Name: varchar('Name', { length: 100 }).notNull().unique(),
  Description: text('Description'),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const categoriesRelations = relations(Categories, ({ many }) => ({
  Products: many(Products),
}));



export const Products = pgTable('Products', {
  ProductId: serial('ProductId').primaryKey(),
  Name: varchar('Name', { length: 255 }).notNull(),
  Description: text('Description'),
  Sku: varchar('Sku', { length: 100 }).notNull().unique(),
  Price: decimal('Price', { precision: 10, scale: 2 }).notNull(),
  BasePrice: decimal('BasePrice', { precision: 10, scale: 2 }).default('0.00').notNull(),
  profitType: ProfitTypeEnum('ProfitType').default('percentage').notNull(),
  profitValue: decimal('ProfitValue', { precision: 10, scale: 2 }).default('0.00').notNull(),
  creditMarkupType: CreditMarkupTypeEnum('CreditMarkupType'),
  creditMarkupValue: decimal('CreditMarkupValue', { precision: 10, scale: 2 }),
  StockQuantity: decimal('StockQuantity', { precision: 10, scale: 2 }).default('0.00').notNull(),
  CategoryId: integer('CategoryId').notNull().references(() => Categories.CategoryId),
  Image: text('Image'),
  Supplier: varchar('Supplier', { length: 255 }),
  ExpiryDate: timestamp('ExpiryDate', { withTimezone: true }),
  IsActive: boolean('IsActive').default(true).notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
  parentProductId: integer('ParentProductId'),
  conversionFactor: integer('ConversionFactor').default(1).notNull(),
  piecesPerPack: integer('pieces_per_pack'),
  currentPiecesPerPack: decimal('current_pieces_per_pack', { precision: 10, scale: 2 }),
  piecesPerBulk: integer('pieces_per_bulk'),
  bulkUnitName: varchar('bulk_unit_name', { length: 50 }),
  piecePrice: decimal('piece_price', { precision: 10, scale: 2 }),
  pieceUnitName: varchar('piece_unit_name', { length: 50 }),
  CreditDueDays: integer('CreditDueDays').default(30),
  CreditPenaltyType: CreditMarkupTypeEnum('CreditPenaltyType'),
  CreditPenaltyValue: decimal('CreditPenaltyValue', { precision: 10, scale: 2 }).default('0.00'),
});

export const productsRelations = relations(Products, ({ one, many }) => ({
  Category: one(Categories, {
    fields: [Products.CategoryId],
    references: [Categories.CategoryId],
  }),
  TransactionItems: many(TransactionItems),
  ParentProduct: one(Products, {
    fields: [Products.parentProductId],
    references: [Products.ProductId],
  }),
  ChildProducts: many(Products),
}));



export const PackOpeningLogs = pgTable('PackOpeningLogs', {
  PackOpeningLogId: serial('PackOpeningLogId').primaryKey(),
  packProductId: integer('PackProductId').notNull().references(() => Products.ProductId),
  pieceProductId: integer('PieceProductId').notNull().references(() => Products.ProductId),
  quantityOpened: integer('QuantityOpened').notNull(),
  piecesAdded: integer('PiecesAdded').notNull(),
  openedAt: timestamp('OpenedAt', { withTimezone: true }).defaultNow().notNull(),
  triggeredByTransactionId: integer('TriggeredByTransactionId').references(() => Transactions.TransactionId),
  triggeredByUserId: integer('TriggeredByUserId').references(() => Users.UserId),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const packOpeningLogsRelations = relations(PackOpeningLogs, ({ one }) => ({
  PackProduct: one(Products, {
    fields: [PackOpeningLogs.packProductId],
    references: [Products.ProductId],
  }),
  PieceProduct: one(Products, {
    fields: [PackOpeningLogs.pieceProductId],
    references: [Products.ProductId],
  }),
  User: one(Users, {
    fields: [PackOpeningLogs.triggeredByUserId],
    references: [Users.UserId],
  }),
  Transaction: one(Transactions, {
    fields: [PackOpeningLogs.triggeredByTransactionId],
    references: [Transactions.TransactionId],
  }),
}));



export const Transactions = pgTable('Transactions', {
  TransactionId: serial('TransactionId').primaryKey(),
  Timestamp: timestamp('Timestamp', { withTimezone: true }).defaultNow().notNull(),
  UserId: integer('UserId').notNull().references(() => Users.UserId), // Staff who processed
  MemberId: integer('MemberId').references(() => Members.MemberId), // Optional member
  TotalAmount: decimal('TotalAmount', { precision: 10, scale: 2 }).notNull(),
  PaymentMethod: varchar('PaymentMethod', { length: 50 }),
  ManualDiscountAmount: decimal('ManualDiscountAmount', { precision: 10, scale: 2 }).default('0.00'),
  CreditMarkupAmount: decimal('CreditMarkupAmount', { precision: 10, scale: 2 }).default('0.00'),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const transactionsRelations = relations(Transactions, ({ one, many }) => ({
  User: one(Users, { fields: [Transactions.UserId], references: [Users.UserId] }),
  Member: one(Members, {
    fields: [Transactions.MemberId],
    references: [Members.MemberId],
  }),
  TransactionItems: many(TransactionItems),
}));



export const TransactionItems = pgTable('TransactionItems', {
  TransactionItemId: serial('TransactionItemId').primaryKey(),
  TransactionId: integer('TransactionId').notNull().references(() => Transactions.TransactionId),
  ProductId: integer('ProductId').notNull().references(() => Products.ProductId),
  Quantity: decimal('Quantity', { precision: 10, scale: 2 }).notNull(),
  PriceAtTimeOfSale: decimal('PriceAtTimeOfSale', { precision: 10, scale: 2 }).notNull(),
  BasePriceAtTimeOfSale: decimal('BasePriceAtTimeOfSale', { precision: 10, scale: 2 }).default('0.00').notNull(),
  Profit: decimal('Profit', { precision: 10, scale: 2 }).default('0.00').notNull(),
  PieceUnitName: varchar('piece_unit_name', { length: 50 }),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});


export const transactionItemsRelations = relations(TransactionItems, ({ one }) => ({
  Transaction: one(Transactions, {
    fields: [TransactionItems.TransactionId],
    references: [Transactions.TransactionId],
  }),
  Product: one(Products, { fields: [TransactionItems.ProductId], references: [Products.ProductId] }),
}));



export const InventoryLogs = pgTable('InventoryLogs', {
  InventoryLogId: serial('InventoryLogId').primaryKey(),
  ProductId: integer('ProductId').notNull().references(() => Products.ProductId),
  Action: varchar('Action', { length: 255 }).notNull(),
  Details: text('Details'),
  UserId: integer('UserId').references(() => Users.UserId),
  Timestamp: timestamp('Timestamp', { withTimezone: true }).defaultNow().notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const inventoryLogsRelations = relations(InventoryLogs, ({ one }) => ({
  Product: one(Products, { fields: [InventoryLogs.ProductId], references: [Products.ProductId] }),
  User: one(Users, { fields: [InventoryLogs.UserId], references: [Users.UserId] }),
}));



export const PendingPayments = pgTable('PendingPayments', {
  PendingPaymentId: serial('PendingPaymentId').primaryKey(),
  MemberId: integer('MemberId').notNull().references(() => Members.MemberId),
  Amount: decimal('Amount', { precision: 10, scale: 2 }).notNull(),
  Status: varchar('Status', { length: 50 }).default('pending').notNull(),
  PaymentDate: timestamp('PaymentDate', { withTimezone: true }).defaultNow().notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const pendingPaymentsRelations = relations(PendingPayments, ({ one }) => ({
  Member: one(Members, { fields: [PendingPayments.MemberId], references: [Members.MemberId] }),
}));



export const rolesRelations = relations(Roles, ({ many }) => ({
	users: many(Users),
}));



export const Events = pgTable('Events', {
  EventId: serial('EventId').primaryKey(),
  Title: varchar('Title', { length: 255 }).notNull(),
  Description: text('Description'),
  EventDate: timestamp('EventDate', { withTimezone: true }).notNull(),
  Type: EventTypeEnum('Type').notNull(),
  Location: varchar('Location', { length: 255 }),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const MemberActivities = pgTable('MemberActivities', {
  ActivityId: serial('ActivityId').primaryKey(),
  MemberId: integer('MemberId').notNull().references(() => Members.MemberId),
  Action: varchar('Action', { length: 255 }).notNull(),
  Amount: decimal('Amount', { precision: 10, scale: 2 }),
  Timestamp: timestamp('Timestamp', { withTimezone: true }).defaultNow().notNull(),
  RelatedTransactionId: integer('RelatedTransactionId').references(() => Transactions.TransactionId),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
  Description: text("description"),
}, (table) => {
  return {
    relatedTransactionFk: foreignKey({ name: 'member_activity_transaction_fk', columns: [table.RelatedTransactionId], foreignColumns: [Transactions.TransactionId] }),
  };
});

export const memberActivitiesRelations = relations(MemberActivities, ({ one }) => ({
  Member: one(Members, {
    fields: [MemberActivities.MemberId],
    references: [Members.MemberId],
  }),
}));



export const AuditLogs = pgTable('AuditLogs', {
  AuditLogId: serial('AuditLogId').primaryKey(),
  UserId: integer('UserId').notNull().references(() => Users.UserId),
  Action: varchar('Action', { length: 255 }).notNull(),
  EntityType: varchar('EntityType', { length: 50 }).notNull(),
  EntityId: integer('EntityId'),
  Details: text('Details'),
  IpAddress: varchar('IpAddress', { length: 45 }),
  UserAgent: text('UserAgent'),
  Timestamp: timestamp('Timestamp', { withTimezone: true }).defaultNow().notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogsRelations = relations(AuditLogs, ({ one }) => ({
  User: one(Users, {
    fields: [AuditLogs.UserId],
    references: [Users.UserId],
  }),
}));



// Payment Requests table for FIFO payment request workflow
export const PaymentRequests = pgTable('PaymentRequests', {
  PaymentRequestId: serial('PaymentRequestId').primaryKey(),
  MemberId: integer('MemberId').notNull().references(() => Members.MemberId),
  Amount: decimal('Amount', { precision: 10, scale: 2 }).notNull(),
  Status: PaymentRequestStatusEnum('Status').default('pending').notNull(),
  RequestedBy: integer('RequestedBy').notNull().references(() => Users.UserId), // User who submitted the request
  ApprovedBy: integer('ApprovedBy').references(() => Users.UserId), // Admin who approved/rejected
  ApprovedAt: timestamp('ApprovedAt', { withTimezone: true }),
  Notes: text('Notes'),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

// Payment Allocations table for tracking FIFO allocations
export const PaymentAllocations = pgTable('PaymentAllocations', {
  AllocationId: serial('AllocationId').primaryKey(),
  PaymentRequestId: integer('PaymentRequestId').notNull().references(() => PaymentRequests.PaymentRequestId),
  CreditId: integer('CreditId').notNull().references(() => Credits.CreditId),
  AllocatedAmount: decimal('AllocatedAmount', { precision: 10, scale: 2 }).notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
});

// Update Credits table to include status and credit item identifier
export const Credits = pgTable('Credits', {
  CreditId: serial('CreditId').primaryKey(),
  MemberId: integer('MemberId').notNull().references(() => Members.MemberId),
  Amount: decimal('Amount', { precision: 10, scale: 2 }).notNull(),
  PaidAmount: decimal('PaidAmount', { precision: 10, scale: 2 }).default('0.00').notNull(),
  Status: CreditStatusEnum('Status').default('pending').notNull(),
  CreditItemId: varchar('CreditItemId', { length: 50 }), // e.g., 'C001', 'C002', etc.
  Type: CreditTypeEnum('Type').notNull(),
  RelatedTransactionId: integer('RelatedTransactionId').references(() => Transactions.TransactionId),
  Notes: text('Notes'),
  Timestamp: timestamp('Timestamp', { withTimezone: true }).defaultNow().notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
  IsPenaltyApplied: boolean('IsPenaltyApplied').default(false).notNull(),
});

// Relations for new tables
export const paymentRequestsRelations = relations(PaymentRequests, ({ one, many }) => ({
  Member: one(Members, {
    fields: [PaymentRequests.MemberId],
    references: [Members.MemberId],
  }),
  RequestedByUser: one(Users, {
    fields: [PaymentRequests.RequestedBy],
    references: [Users.UserId],
  }),
  ApprovedByUser: one(Users, {
    fields: [PaymentRequests.ApprovedBy],
    references: [Users.UserId],
  }),
  Allocations: many(PaymentAllocations),
}));



export const paymentAllocationsRelations = relations(PaymentAllocations, ({ one }) => ({
  PaymentRequest: one(PaymentRequests, {
    fields: [PaymentAllocations.PaymentRequestId],
    references: [PaymentRequests.PaymentRequestId],
  }),
  Credit: one(Credits, {
    fields: [PaymentAllocations.CreditId],
    references: [Credits.CreditId],
  }),
}));



export const creditsRelations = relations(Credits, ({ one }) => ({
  Member: one(Members, {
    fields: [Credits.MemberId],
    references: [Members.MemberId],
  }),
  RelatedTransaction: one(Transactions, {
    fields: [Credits.RelatedTransactionId],
    references: [Transactions.TransactionId],
  }),
}));

// Messages table for admin-to-member messaging
export const Messages = pgTable('Messages', {
  MessageId: serial('MessageId').primaryKey(),
  SenderId: integer('SenderId').notNull().references(() => Users.UserId), // Admin user sending the message
  ReceiverId: integer('ReceiverId').notNull().references(() => Members.MemberId), // Member receiving the message
  Subject: varchar('Subject', { length: 255 }).notNull(),
  Content: text('Content').notNull(),
  IsRead: boolean('IsRead').default(false).notNull(),
  SentAt: timestamp('SentAt', { withTimezone: true }).defaultNow().notNull(),
  CreatedAt: timestamp('CreatedAt', { withTimezone: true }).defaultNow().notNull(),
  UpdatedAt: timestamp('UpdatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const messagesRelations = relations(Messages, ({ one, many }) => ({
  Sender: one(Users, {
    fields: [Messages.SenderId],
    references: [Users.UserId],
  }),
  Receiver: one(Members, {
    fields: [Messages.ReceiverId],
    references: [Members.MemberId],
  }),
  Replies: many(Messages),
}));
