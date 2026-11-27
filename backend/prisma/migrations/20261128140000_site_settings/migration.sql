-- Admin-editable site settings: contact details and rental pricing.
ALTER TABLE "Branding" ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "whatsapp" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  ADD COLUMN "extrasPricing" JSONB,
  ADD COLUMN "insurancePricing" JSONB;
