import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';

export const brandingRouter = Router();

/**
 * Public branding endpoint. Returns the OFFICIAL logo that an admin uploaded
 * (through the Media Manager) into the brand folder. The frontend reads this
 * so the real PNG appears everywhere with zero code changes.
 *
 * The brand folder is `<CLOUDINARY_FOLDER>/brand` (e.g. mideeye-motors/brand).
 */
brandingRouter.get('/', async (_req, res) => {
  const brandFolder = `${env.cloudinary.folder}/brand`;
  const logo = await prisma.mediaAsset.findFirst({
    where: {
      OR: [{ folder: brandFolder }, { folder: { contains: 'brand' } }],
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    logoUrl: logo?.secureUrl ?? null,
    logoPublicId: logo?.publicId ?? null,
    brandFolder,
  });
});
