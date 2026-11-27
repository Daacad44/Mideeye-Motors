import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { buildImageUrl, type Preset } from '../lib/imagekit.js';
import { authenticate, requireStaff, ROLE_RANK } from '../middleware/auth.js';
import { buildCatalog } from '../lib/pricing.js';
import { audit } from '../lib/audit.js';

export const brandingRouter = Router();

/** Public view of the site settings (logo, contact details, rental pricing). */
function present(b: Awaited<ReturnType<typeof getOrCreateBranding>>) {
  return {
    logo: resolveImage(b.logo, 'logo'),
    favicon: resolveImage(b.favicon, 'logo'),
    heroImage: resolveImage(b.heroImage, 'hero'),
    primaryColor: b.primaryColor,
    phone: b.phone,
    email: b.email,
    address: b.address,
    whatsapp: b.whatsapp,
    socials: b.socials ?? {},
    pricing: buildCatalog(b),
  };
}

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
  res.json(present(b));
});

const patchSchema = z.object({
  logoImageId: z.string().nullable().optional(),
  faviconImageId: z.string().nullable().optional(),
  heroImageId: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().or(z.literal('')).optional(),
  address: z.string().trim().max(200).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  socials: z.record(z.string().trim().max(300)).optional(),
  // Rental pricing (admin and above): tax as a fraction (0.05 = 5%), add-ons in USD/day.
  taxRate: z.number().min(0).max(0.5).optional(),
  extrasPricing: z.record(z.number().min(0).max(10_000)).optional(),
  insurancePricing: z.record(z.number().min(0).max(10_000)).optional(),
});

const PRICING_FIELDS = ['taxRate', 'extrasPricing', 'insurancePricing'] as const;

// PATCH /api/branding — admin-only.
brandingRouter.patch('/', authenticate, requireStaff, async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (PRICING_FIELDS.some((f) => f in parsed.data) && ROLE_RANK[req.user!.role] < ROLE_RANK.ADMIN) {
    return res.status(403).json({ error: 'Only an admin can change rental prices.' });
  }

  await getOrCreateBranding();
  const b = await prisma.branding.update({
    where: { id: 'default' },
    data: parsed.data as any,
    include: { logo: true, favicon: true, heroImage: true },
  });
  await audit(req, 'BRANDING_UPDATE', 'Branding', 'default', parsed.data);
  res.json(present(b));
});
