import { prisma } from './prisma.js';
import { buildCatalog, type PricingCatalog } from './pricing.js';

/** The rental pricing in force: admin overrides from Settings, else the defaults. */
export async function getPricingCatalog(): Promise<PricingCatalog> {
  const row = await prisma.branding.findUnique({
    where: { id: 'default' },
    select: { taxRate: true, extrasPricing: true, insurancePricing: true },
  });
  return buildCatalog(row);
}
