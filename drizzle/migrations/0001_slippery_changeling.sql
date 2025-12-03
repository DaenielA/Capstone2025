ALTER TABLE "Products" ALTER COLUMN "CreditPenaltyValue" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "CreditSettings" ADD COLUMN "CreditDueDays" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "CreditSettings" ADD COLUMN "CreditPenaltyType" "CreditMarkupType";--> statement-breakpoint
ALTER TABLE "CreditSettings" ADD COLUMN "CreditPenaltyValue" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "PaymentSchedule" ADD COLUMN "CreditId" integer;--> statement-breakpoint
ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_CreditId_Credits_CreditId_fk" FOREIGN KEY ("CreditId") REFERENCES "public"."Credits"("CreditId") ON DELETE no action ON UPDATE no action;