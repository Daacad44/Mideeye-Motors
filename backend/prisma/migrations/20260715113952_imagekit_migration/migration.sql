/*
  Warnings:

  - You are about to drop the column `cloudinaryFolder` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `cloudinaryPublicId` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `coverImage` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `heroImage` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `Vehicle` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `VehicleImage` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `VehicleImage` table. All the data in the column will be lost.
  - You are about to drop the `MediaAsset` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `imageId` to the `VehicleImage` table without a default value. This is not possible if the table is not empty.

  ── CLOUDINARY → IMAGEKIT MIGRATION (explicit, documented, reversible) ──
  This is a MIGRATION-OF-STORAGE-PROVIDER, not a data migration: every existing
  `Vehicle.heroImage/coverImage/thumbnail` and `VehicleImage.publicId` value is a
  Cloudinary publicId pointing at a Cloudinary account/asset that no longer
  exists in this system (Cloudinary is being removed entirely). There is no
  equivalent ImageKit asset to remap them to — re-uploading the seed
  placeholder photos was rejected in favour of the simpler, explicit path:
  WIPE the placeholder gallery rows and let an admin upload real photos via
  the new Media Library. All non-image vehicle data (pricing, specs,
  descriptions, bookings, users, etc.) is untouched.
  Reversible: this only deletes VehicleImage rows (pure gallery placeholders)
  and nulls the three FK columns on Vehicle — no other tables are touched.
*/

-- Wipe placeholder gallery rows so the new NOT NULL "imageId" column below
-- (which has no meaningful default) can be added safely. Vehicle.hero/cover/
-- thumbnail FKs are dropped-and-recreated as nullable, so they need no
-- explicit UPDATE — they simply start NULL until an admin uploads real photos.
DELETE FROM "VehicleImage";

-- DropForeignKey
ALTER TABLE "MediaAsset" DROP CONSTRAINT "MediaAsset_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "MediaAsset" DROP CONSTRAINT "MediaAsset_vehicleId_fkey";

-- DropIndex
DROP INDEX "VehicleImage_vehicleId_position_idx";

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "cloudinaryFolder",
DROP COLUMN "cloudinaryPublicId",
DROP COLUMN "coverImage",
DROP COLUMN "heroImage",
DROP COLUMN "thumbnail",
ADD COLUMN     "coverImageId" TEXT,
ADD COLUMN     "heroImageId" TEXT,
ADD COLUMN     "thumbnailId" TEXT;

-- AlterTable
ALTER TABLE "VehicleImage" DROP COLUMN "position",
DROP COLUMN "publicId",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imageId" TEXT NOT NULL,
ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHero" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "MediaAsset";

-- DropEnum
DROP TYPE "ResourceType";

-- CreateTable
CREATE TABLE "MediaImage" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "mimeType" TEXT,
    "altText" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "folder" TEXT,
    "tags" TEXT[],
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branding" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "logoImageId" TEXT,
    "faviconImageId" TEXT,
    "heroImageId" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0b67c2',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "socials" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaImage_fileId_key" ON "MediaImage"("fileId");

-- CreateIndex
CREATE INDEX "MediaImage_folder_idx" ON "MediaImage"("folder");

-- CreateIndex
CREATE INDEX "VehicleImage_vehicleId_displayOrder_idx" ON "VehicleImage"("vehicleId", "displayOrder");

-- CreateIndex
CREATE INDEX "VehicleImage_imageId_idx" ON "VehicleImage"("imageId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_thumbnailId_fkey" FOREIGN KEY ("thumbnailId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleImage" ADD CONSTRAINT "VehicleImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaImage" ADD CONSTRAINT "MediaImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_logoImageId_fkey" FOREIGN KEY ("logoImageId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_faviconImageId_fkey" FOREIGN KEY ("faviconImageId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branding" ADD CONSTRAINT "Branding_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "MediaImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
