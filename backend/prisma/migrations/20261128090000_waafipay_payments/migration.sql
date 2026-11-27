-- WaafiPay push-to-phone payments: who was charged and, on failure, why.
ALTER TABLE "Payment" ADD COLUMN "payerPhone" TEXT,
ADD COLUMN "failureReason" TEXT;
