-- AlterTable
-- Contact details captured at checkout so guest bookings (no userId) still
-- carry a name/email/phone. All nullable — existing rows need no backfill.
ALTER TABLE "Booking" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "customerPhone" TEXT;
