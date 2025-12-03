CREATE TYPE "public"."CreditMarkupType" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."CreditStatus" AS ENUM('pending', 'partially_paid', 'fully_paid');--> statement-breakpoint
CREATE TYPE "public"."CreditType" AS ENUM('Earned', 'Spent', 'Adjustment', 'Payment');--> statement-breakpoint
CREATE TYPE "public"."EventType" AS ENUM('Operation', 'Community', 'Management');--> statement-breakpoint
CREATE TYPE "public"."PaymentRequestStatus" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."ProfitType" AS ENUM('percentage', 'fixed');--> statement-breakpoint
CREATE TABLE "AuditLogs" (
	"AuditLogId" serial PRIMARY KEY NOT NULL,
	"UserId" integer NOT NULL,
	"Action" varchar(255) NOT NULL,
	"EntityType" varchar(50) NOT NULL,
	"EntityId" integer,
	"Details" text,
	"IpAddress" varchar(45),
	"UserAgent" text,
	"Timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Categories" (
	"CategoryId" serial PRIMARY KEY NOT NULL,
	"Name" varchar(100) NOT NULL,
	"Description" text,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Categories_Name_unique" UNIQUE("Name")
);
--> statement-breakpoint
CREATE TABLE "CreditSettings" (
	"SettingId" serial PRIMARY KEY NOT NULL,
	"InterestRate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"GracePeriodDays" integer DEFAULT 30 NOT NULL,
	"LateFeeAmount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"LateFeePercentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"DefaultMarkupPercentage" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Credits" (
	"CreditId" serial PRIMARY KEY NOT NULL,
	"MemberId" integer NOT NULL,
	"Amount" numeric(10, 2) NOT NULL,
	"PaidAmount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"Status" "CreditStatus" DEFAULT 'pending' NOT NULL,
	"CreditItemId" varchar(50),
	"Type" "CreditType" NOT NULL,
	"RelatedTransactionId" integer,
	"Notes" text,
	"Timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Events" (
	"EventId" serial PRIMARY KEY NOT NULL,
	"Title" varchar(255) NOT NULL,
	"Description" text,
	"EventDate" timestamp with time zone NOT NULL,
	"Type" "EventType" NOT NULL,
	"Location" varchar(255),
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InventoryLogs" (
	"InventoryLogId" serial PRIMARY KEY NOT NULL,
	"ProductId" integer NOT NULL,
	"Action" varchar(255) NOT NULL,
	"Details" text,
	"UserId" integer,
	"Timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "InventorySettings" (
	"SettingId" serial PRIMARY KEY NOT NULL,
	"LowStockThreshold" integer DEFAULT 10 NOT NULL,
	"ExpiryWarningDays" integer DEFAULT 30 NOT NULL,
	"NotificationInterval" integer DEFAULT 5000 NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MemberActivities" (
	"ActivityId" serial PRIMARY KEY NOT NULL,
	"MemberId" integer NOT NULL,
	"Action" varchar(255) NOT NULL,
	"Amount" numeric(10, 2),
	"Timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"RelatedTransactionId" integer,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "Members" (
	"MemberId" serial PRIMARY KEY NOT NULL,
	"Name" varchar(255) NOT NULL,
	"Email" varchar(255) NOT NULL,
	"Phone" varchar(50),
	"Address" text,
	"CreditBalance" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"CreditLimit" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"UserId" integer,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"Status" varchar(50) DEFAULT 'active' NOT NULL,
	CONSTRAINT "Members_Email_unique" UNIQUE("Email")
);
--> statement-breakpoint
CREATE TABLE "Messages" (
	"MessageId" serial PRIMARY KEY NOT NULL,
	"SenderId" integer NOT NULL,
	"ReceiverId" integer NOT NULL,
	"Subject" varchar(255) NOT NULL,
	"Content" text NOT NULL,
	"IsRead" boolean DEFAULT false NOT NULL,
	"SentAt" timestamp with time zone DEFAULT now() NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PackOpeningLogs" (
	"PackOpeningLogId" serial PRIMARY KEY NOT NULL,
	"PackProductId" integer NOT NULL,
	"PieceProductId" integer NOT NULL,
	"QuantityOpened" integer NOT NULL,
	"PiecesAdded" integer NOT NULL,
	"OpenedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"TriggeredByTransactionId" integer,
	"TriggeredByUserId" integer,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentAllocations" (
	"AllocationId" serial PRIMARY KEY NOT NULL,
	"PaymentRequestId" integer NOT NULL,
	"CreditId" integer NOT NULL,
	"AllocatedAmount" numeric(10, 2) NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentRequests" (
	"PaymentRequestId" serial PRIMARY KEY NOT NULL,
	"MemberId" integer NOT NULL,
	"Amount" numeric(10, 2) NOT NULL,
	"Status" "PaymentRequestStatus" DEFAULT 'pending' NOT NULL,
	"RequestedBy" integer NOT NULL,
	"ApprovedBy" integer,
	"ApprovedAt" timestamp with time zone,
	"Notes" text,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentSchedule" (
	"ScheduleId" serial PRIMARY KEY NOT NULL,
	"MemberId" integer NOT NULL,
	"TransactionId" integer,
	"Amount" numeric(10, 2) NOT NULL,
	"PaidAmount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"DueDate" timestamp with time zone NOT NULL,
	"Status" varchar(50) DEFAULT 'pending' NOT NULL,
	"InstallmentNumber" integer,
	"TotalInstallments" integer,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PendingPayments" (
	"PendingPaymentId" serial PRIMARY KEY NOT NULL,
	"MemberId" integer NOT NULL,
	"Amount" numeric(10, 2) NOT NULL,
	"Status" varchar(50) DEFAULT 'pending' NOT NULL,
	"PaymentDate" timestamp with time zone DEFAULT now() NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Products" (
	"ProductId" serial PRIMARY KEY NOT NULL,
	"Name" varchar(255) NOT NULL,
	"Description" text,
	"Sku" varchar(100) NOT NULL,
	"Price" numeric(10, 2) NOT NULL,
	"BasePrice" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"ProfitType" "ProfitType" DEFAULT 'percentage' NOT NULL,
	"ProfitValue" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"CreditMarkupType" "CreditMarkupType",
	"CreditMarkupValue" numeric(10, 2),
	"CreditDueDays" integer DEFAULT 30,
	"CreditPenaltyType" "CreditMarkupType",
	"CreditPenaltyValue" numeric(10, 2),
	"StockQuantity" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"CategoryId" integer NOT NULL,
	"Image" text,
	"Supplier" varchar(255),
	"ExpiryDate" timestamp with time zone,
	"IsActive" boolean DEFAULT true NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ParentProductId" integer,
	"ConversionFactor" integer DEFAULT 1 NOT NULL,
	"pieces_per_pack" integer,
	"current_pieces_per_pack" numeric(10, 2),
	"pieces_per_bulk" integer,
	"bulk_unit_name" varchar(50),
	"piece_price" numeric(10, 2),
	"piece_unit_name" varchar(50),
	CONSTRAINT "Products_Sku_unique" UNIQUE("Sku")
);
--> statement-breakpoint
CREATE TABLE "Roles" (
	"RoleId" serial PRIMARY KEY NOT NULL,
	"Name" varchar(50) NOT NULL,
	"Description" text,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Roles_Name_unique" UNIQUE("Name")
);
--> statement-breakpoint
CREATE TABLE "TransactionItems" (
	"TransactionItemId" serial PRIMARY KEY NOT NULL,
	"TransactionId" integer NOT NULL,
	"ProductId" integer NOT NULL,
	"Quantity" numeric(10, 2) NOT NULL,
	"PriceAtTimeOfSale" numeric(10, 2) NOT NULL,
	"BasePriceAtTimeOfSale" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"Profit" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"piece_unit_name" varchar(50),
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Transactions" (
	"TransactionId" serial PRIMARY KEY NOT NULL,
	"Timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"UserId" integer NOT NULL,
	"MemberId" integer,
	"TotalAmount" numeric(10, 2) NOT NULL,
	"PaymentMethod" varchar(50),
	"ManualDiscountAmount" numeric(10, 2) DEFAULT '0.00',
	"CreditMarkupAmount" numeric(10, 2) DEFAULT '0.00',
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Users" (
	"UserId" serial PRIMARY KEY NOT NULL,
	"Name" varchar(255) NOT NULL,
	"Email" varchar(255) NOT NULL,
	"PasswordHash" varchar(255) NOT NULL,
	"RoleId" integer NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"IsActive" boolean DEFAULT true NOT NULL,
	CONSTRAINT "Users_Email_unique" UNIQUE("Email")
);
--> statement-breakpoint
CREATE TABLE "VerificationTokens" (
	"TokenId" serial PRIMARY KEY NOT NULL,
	"Token" varchar(255) NOT NULL,
	"Type" varchar(50) NOT NULL,
	"MemberId" integer,
	"UserId" integer,
	"ExpiresAt" timestamp with time zone NOT NULL,
	"CreatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"UsedAt" timestamp with time zone,
	CONSTRAINT "VerificationTokens_Token_unique" UNIQUE("Token")
);
--> statement-breakpoint
ALTER TABLE "AuditLogs" ADD CONSTRAINT "AuditLogs_UserId_Users_UserId_fk" FOREIGN KEY ("UserId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Credits" ADD CONSTRAINT "Credits_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Credits" ADD CONSTRAINT "Credits_RelatedTransactionId_Transactions_TransactionId_fk" FOREIGN KEY ("RelatedTransactionId") REFERENCES "public"."Transactions"("TransactionId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_ProductId_Products_ProductId_fk" FOREIGN KEY ("ProductId") REFERENCES "public"."Products"("ProductId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_UserId_Users_UserId_fk" FOREIGN KEY ("UserId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MemberActivities" ADD CONSTRAINT "MemberActivities_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MemberActivities" ADD CONSTRAINT "MemberActivities_RelatedTransactionId_Transactions_TransactionId_fk" FOREIGN KEY ("RelatedTransactionId") REFERENCES "public"."Transactions"("TransactionId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "MemberActivities" ADD CONSTRAINT "member_activity_transaction_fk" FOREIGN KEY ("RelatedTransactionId") REFERENCES "public"."Transactions"("TransactionId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Members" ADD CONSTRAINT "Members_UserId_Users_UserId_fk" FOREIGN KEY ("UserId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_SenderId_Users_UserId_fk" FOREIGN KEY ("SenderId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Messages" ADD CONSTRAINT "Messages_ReceiverId_Members_MemberId_fk" FOREIGN KEY ("ReceiverId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PackOpeningLogs" ADD CONSTRAINT "PackOpeningLogs_PackProductId_Products_ProductId_fk" FOREIGN KEY ("PackProductId") REFERENCES "public"."Products"("ProductId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PackOpeningLogs" ADD CONSTRAINT "PackOpeningLogs_PieceProductId_Products_ProductId_fk" FOREIGN KEY ("PieceProductId") REFERENCES "public"."Products"("ProductId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PackOpeningLogs" ADD CONSTRAINT "PackOpeningLogs_TriggeredByTransactionId_Transactions_TransactionId_fk" FOREIGN KEY ("TriggeredByTransactionId") REFERENCES "public"."Transactions"("TransactionId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PackOpeningLogs" ADD CONSTRAINT "PackOpeningLogs_TriggeredByUserId_Users_UserId_fk" FOREIGN KEY ("TriggeredByUserId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentAllocations" ADD CONSTRAINT "PaymentAllocations_PaymentRequestId_PaymentRequests_PaymentRequestId_fk" FOREIGN KEY ("PaymentRequestId") REFERENCES "public"."PaymentRequests"("PaymentRequestId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentAllocations" ADD CONSTRAINT "PaymentAllocations_CreditId_Credits_CreditId_fk" FOREIGN KEY ("CreditId") REFERENCES "public"."Credits"("CreditId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_RequestedBy_Users_UserId_fk" FOREIGN KEY ("RequestedBy") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentRequests" ADD CONSTRAINT "PaymentRequests_ApprovedBy_Users_UserId_fk" FOREIGN KEY ("ApprovedBy") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_TransactionId_Transactions_TransactionId_fk" FOREIGN KEY ("TransactionId") REFERENCES "public"."Transactions"("TransactionId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PendingPayments" ADD CONSTRAINT "PendingPayments_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Products" ADD CONSTRAINT "Products_CategoryId_Categories_CategoryId_fk" FOREIGN KEY ("CategoryId") REFERENCES "public"."Categories"("CategoryId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TransactionItems" ADD CONSTRAINT "TransactionItems_TransactionId_Transactions_TransactionId_fk" FOREIGN KEY ("TransactionId") REFERENCES "public"."Transactions"("TransactionId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TransactionItems" ADD CONSTRAINT "TransactionItems_ProductId_Products_ProductId_fk" FOREIGN KEY ("ProductId") REFERENCES "public"."Products"("ProductId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_UserId_Users_UserId_fk" FOREIGN KEY ("UserId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Transactions" ADD CONSTRAINT "Transactions_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "Users_RoleId_Roles_RoleId_fk" FOREIGN KEY ("RoleId") REFERENCES "public"."Roles"("RoleId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VerificationTokens" ADD CONSTRAINT "VerificationTokens_MemberId_Members_MemberId_fk" FOREIGN KEY ("MemberId") REFERENCES "public"."Members"("MemberId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "VerificationTokens" ADD CONSTRAINT "VerificationTokens_UserId_Users_UserId_fk" FOREIGN KEY ("UserId") REFERENCES "public"."Users"("UserId") ON DELETE no action ON UPDATE no action;