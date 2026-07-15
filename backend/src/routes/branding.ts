import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { buildImageUrl, type Preset } from '../lib/imagekit.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

export const brandingRouter = Router();

function resolveImage(img: { filePath: string; altText: string } | null, preset: Preset) {
  if (!img) return null;
  return { url: buildImageUrl(img.filePath, preset), alt: img.altText };
}

async function getOrCreateBranding() {
  return prisma.branding.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
    include: { logo: true, favicon: true, heroImage: true },
  });
}

// GET /api/branding — public. Always returns 200; a missing logo resolves to null
// (frontend renders a placeholder — never a broken request or fake logo).
brandingRouter.get('/', async (_req, res) => {
  const b = await getOrCreateBranding();
  res.json({
    logo: resolveImage(b.logo, 'logo'),
    favicon: resolveImage(b.favicon, 'logo'),
    heroImage: resolveImage(b.heroImage, 'hero'),
    primaryColor: b.primaryColor,
    phone: b.phone,
    email: b.email,
    socials: b.socials ?? {},
  });
});

const patchSchema = z.object({
  logoImageId: z.string().nullable().optional(),
  faviconImageId: z.string().nullable().optional(),
  heroImageId: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().or(z.literal('')).optional(),
  socials: z.record(z.string()).optional(),
});

// PATCH /api/branding — admin-only.
brandingRouter.patch('/', authenticate, requireStaff, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await getOrCreateBranding();
  const b = await prisma.branding.update({
    where: { id: 'default' },
    data: parsed.data as any,
    include: { logo: true, favicon: true, heroImage: true },
  });
  await audit(req, 'BRANDING_UPDATE', 'Branding', 'default', parsed.data);
  res.json({
    logo: resolveImage(b.logo, 'logo'),
    favicon: resolveImage(b.favicon, 'logo'),
    heroImage: resolveImage(b.heroImage, 'hero'),
    primaryColor: b.primaryColor,
    phone: b.phone,
    email: b.email,
    socials: b.socials ?? {},
  });
});
