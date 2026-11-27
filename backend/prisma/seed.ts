import 'dotenv/config';
import { PrismaClient, Category, Transmission, FuelType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Seed accounts come ONLY from the environment; no password is ever stored in
 * the repository. Existing accounts are never touched (passwords included), so
 * re-running the seed on every boot is safe.
 *
 *  - In production, an account whose email/password env vars are missing is
 *    simply skipped (with a warning).
 *  - In development, a missing password is replaced by a random one that is
 *    printed once, so a fresh local database still has a usable admin.
 */
function seedAccount(emailVar: string, passwordVar: string, devEmail: string) {
  const email = process.env[emailVar]?.trim() || (isProduction ? '' : devEmail);
  let password = process.env[passwordVar] ?? '';
  let generated = false;
  if (!password && !isProduction) {
    password = randomBytes(12).toString('base64url');
    generated = true;
  }
  if (!email || !password) {
    console.warn(`⚠️  ${emailVar}/${passwordVar} not set, skipping this seed account.`);
    return null;
  }
  if (password.length < 10) {
    throw new Error(`${passwordVar} must be at least 10 characters.`);
  }
  return { email, password, generated };
}

async function upsertSeedUser(
  account: { email: string; password: string; generated: boolean } | null,
  name: string,
  role: 'SUPER_ADMIN' | 'ADMIN',
) {
  if (!account) return;
  const existing = await prisma.user.findUnique({ where: { email: account.email } });
  if (existing) {
    // Keep the existing password; only make sure the role is right.
    if (role === 'SUPER_ADMIN' && existing.role !== 'SUPER_ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role, status: 'ACTIVE' } });
    }
    return;
  }
  await prisma.user.create({
    data: { name, email: account.email, password: await bcrypt.hash(account.password, 12), role },
  });
  console.log(`👤 Created ${role} ${account.email}`);
  if (account.generated) console.log(`   Generated dev password (shown once): ${account.password}`);
}

type Seed = {
  title: string;
  slug: string;
  category: Category;
  brand: string;
  year: number;
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  transmission: Transmission;
  fuelType: FuelType;
  engine: string;
  horsePower: number;
  seats: number;
  doors: number;
  color: string;
  location: string;
  rating: number;
  reviews: number;
  featured: boolean;
  description: string;
  features: string[];
};

const data: Seed[] = [
  {
    title: 'Toyota Prado TX', slug: 'toyota-prado-tx', category: 'SUV', brand: 'Toyota', year: 2023,
    pricePerDay: 0.1, pricePerWeek: 0.7, pricePerMonth: 3, transmission: 'Automatic', fuelType: 'Diesel',
    engine: '2.8L Turbo Diesel', horsePower: 201, seats: 7, doors: 5, color: 'Pearl White', location: 'Mogadishu HQ',
    rating: 4.9, reviews: 0, featured: true,
    description: 'The family and long-distance favourite. Seven seats, full-time 4WD and a calm, comfortable cabin — delivered clean, insured and ready for any road in Somalia.',
    features: ['Full-time 4WD', 'Leather seats', '7 seats (3 rows)', 'Rear camera', 'Rear-row air conditioning', 'Bluetooth & USB', 'Cruise control', 'Full-size spare wheel'],
  },
  {
    title: 'Toyota Land Cruiser 2024', slug: 'toyota-land-cruiser-2024', category: 'SUV', brand: 'Toyota', year: 2024,
    pricePerDay: 120, pricePerWeek: 760, pricePerMonth: 2900, transmission: 'Automatic', fuelType: 'Diesel',
    engine: '3.3L V6 Twin-Turbo', horsePower: 305, seats: 7, doors: 5, color: 'Onyx Black', location: 'Mogadishu HQ',
    rating: 4.9, reviews: 2140, featured: true,
    description: 'The definitive luxury SUV. Commanding presence, effortless power and go-anywhere capability — delivered spotless, fully insured and ready the moment you are.',
    features: ['Full-time 4WD', 'Adaptive cruise control', 'Ventilated leather seats', '360° camera', 'Panoramic sunroof', 'Wireless CarPlay & Android Auto', 'Premium JBL audio', 'Multi-terrain select'],
  },
  {
    title: 'Toyota Camry 2023', slug: 'toyota-camry-2023', category: 'Sedan', brand: 'Toyota', year: 2023,
    pricePerDay: 60, pricePerWeek: 380, pricePerMonth: 1450, transmission: 'Automatic', fuelType: 'Petrol',
    engine: '2.5L 4-Cylinder', horsePower: 203, seats: 5, doors: 4, color: 'Pearl White', location: 'Mogadishu HQ',
    rating: 4.8, reviews: 1320, featured: true,
    description: 'A refined executive sedan blending comfort, economy and understated elegance for city and highway alike.',
    features: ['Lane-keep assist', 'Dual-zone climate', 'Heated front seats', 'Apple CarPlay', 'Blind-spot monitor', 'Keyless entry'],
  },
  {
    title: 'Hyundai Santa Fe 2023', slug: 'hyundai-santa-fe-2023', category: 'SUV', brand: 'Hyundai', year: 2023,
    pricePerDay: 80, pricePerWeek: 510, pricePerMonth: 1950, transmission: 'Automatic', fuelType: 'Diesel',
    engine: '2.2L CRDi', horsePower: 202, seats: 7, doors: 5, color: 'Midnight Blue', location: 'Hargeisa Branch',
    rating: 4.7, reviews: 890, featured: true,
    description: 'A spacious, tech-forward family SUV with three rows of comfort and confident all-weather traction.',
    features: ['HTRAC all-wheel drive', 'Panoramic display', 'Ventilated seats', 'Smart power tailgate', 'Surround-view monitor', 'Wireless charging'],
  },
  {
    title: 'Kia K5 2023', slug: 'kia-k5-2023', category: 'Sedan', brand: 'Kia', year: 2023,
    pricePerDay: 55, pricePerWeek: 350, pricePerMonth: 1350, transmission: 'Automatic', fuelType: 'Petrol',
    engine: '1.6L Turbo', horsePower: 180, seats: 5, doors: 4, color: 'Steel Grey', location: 'Mogadishu HQ',
    rating: 4.7, reviews: 640, featured: true,
    description: 'Bold, sporty styling meets everyday practicality in this sharply designed mid-size sedan.',
    features: ['Sport-tuned suspension', 'Dual 10.25" displays', 'Highway drive assist', 'Bose premium audio', 'Ambient lighting', 'Smart cruise control'],
  },
  {
    title: 'Mercedes-Benz E-Class', slug: 'mercedes-benz-e-class', category: 'Luxury', brand: 'Mercedes-Benz', year: 2024,
    pricePerDay: 180, pricePerWeek: 1150, pricePerMonth: 4400, transmission: 'Automatic', fuelType: 'Petrol',
    engine: '2.0L Turbo Mild-Hybrid', horsePower: 255, seats: 5, doors: 4, color: 'Obsidian Black', location: 'Mogadishu HQ',
    rating: 4.9, reviews: 512, featured: false,
    description: 'The benchmark executive saloon. First-class refinement, MBUX intelligence and serene, chauffeur-grade comfort.',
    features: ['MBUX Superscreen', 'Burmester 3D audio', 'Air Body Control', 'Nappa leather', 'Massage seats', 'Augmented-reality navigation'],
  },
  {
    title: 'BMW 5 Series 2024', slug: 'bmw-5-series-2024', category: 'Luxury', brand: 'BMW', year: 2024,
    pricePerDay: 175, pricePerWeek: 1120, pricePerMonth: 4300, transmission: 'Automatic', fuelType: 'Hybrid',
    engine: '2.0L TwinPower Turbo', horsePower: 255, seats: 5, doors: 4, color: 'Alpine White', location: 'Hargeisa Branch',
    rating: 4.9, reviews: 478, featured: false,
    description: 'The ultimate business athlete — dynamic handling, curved widescreen cockpit and effortless poise.',
    features: ['BMW Curved Display', 'Driving Assistant Pro', 'Harman Kardon audio', 'Adaptive suspension', 'Gesture control', 'Heated & cooled seats'],
  },
  {
    title: 'Toyota Hilux Surf', slug: 'toyota-hilux-surf', category: 'Pickup', brand: 'Toyota', year: 2023,
    pricePerDay: 90, pricePerWeek: 570, pricePerMonth: 2200, transmission: 'Manual', fuelType: 'Diesel',
    engine: '2.8L Turbo Diesel', horsePower: 201, seats: 5, doors: 4, color: 'Desert Bronze', location: 'Kismayo Branch',
    rating: 4.6, reviews: 410, featured: false,
    description: 'Rugged, unstoppable and built for the toughest terrain — the workhorse legend that never quits.',
    features: ['Part-time 4WD', 'Rear differential lock', 'Heavy-duty suspension', 'Skid plates', 'Tow package', 'All-terrain tyres'],
  },
  {
    title: 'Tesla Model 3 2024', slug: 'tesla-model-3-2024', category: 'Electric', brand: 'Tesla', year: 2024,
    pricePerDay: 140, pricePerWeek: 890, pricePerMonth: 3400, transmission: 'Automatic', fuelType: 'Electric',
    engine: 'Dual Motor AWD', horsePower: 366, seats: 5, doors: 4, color: 'Ultra Red', location: 'Mogadishu HQ',
    rating: 4.8, reviews: 726, featured: false,
    description: 'Silent, instant and intelligent. Zero-emission performance with a minimalist cabin and up to 500 km of range.',
    features: ['Autopilot', '15" central touchscreen', 'Glass roof', 'Over-the-air updates', 'Supercharging', 'Premium connectivity'],
  },
  {
    title: 'Toyota HiAce Van', slug: 'toyota-hiace-van', category: 'Van', brand: 'Toyota', year: 2023,
    pricePerDay: 100, pricePerWeek: 640, pricePerMonth: 2450, transmission: 'Manual', fuelType: 'Diesel',
    engine: '2.8L Turbo Diesel', horsePower: 174, seats: 14, doors: 5, color: 'Super White', location: 'Mogadishu HQ',
    rating: 4.6, reviews: 355, featured: false,
    description: 'The ultimate group mover — spacious, dependable and comfortable for airport transfers, tours and events.',
    features: ['14-seat capacity', 'Dual air-conditioning', 'High roof', 'Ample luggage space', 'USB charging throughout', 'Reverse camera'],
  },
];

async function main() {
  console.log('🌱 Seeding Daljir Rental Car…');

  // Super Admin: the only account that can manage other admins.
  await upsertSeedUser(
    seedAccount('SEED_SUPER_ADMIN_EMAIL', 'SEED_SUPER_ADMIN_PASSWORD', 'superadmin@daljir.local'),
    'Super Admin',
    'SUPER_ADMIN',
  );
  await upsertSeedUser(
    seedAccount('SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD', 'admin@daljir.local'),
    'Daljir Admin',
    'ADMIN',
  );

  // Site-wide branding — a single default row. Image fields (logo, favicon,
  // hero) start empty; an admin uploads the real assets via the Media
  // Library and PATCHes /api/branding to point at them. No image is ever
  // hardcoded or bundled with the app.
  await prisma.branding.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      primaryColor: '#0b67c2',
      phone: '+252 61 2345678',
      email: 'hello@daljirrentalcar.com',
      socials: {},
    },
  });

  // Vehicles: pricing/specs/descriptions only. Image fields (hero/cover/
  // thumbnail/gallery) are intentionally left empty — old Cloudinary
  // publicIds pointed at assets that no longer exist under ImageKit, so
  // placeholder image references are wiped rather than faked. An admin
  // uploads real photos via the Media Library, which populates these
  // fields automatically (no code change, no redeploy).
  // Create-only: the seed runs on every container boot, so it must never
  // overwrite prices, availability or text an admin has edited since.
  for (const v of data) {
    await prisma.vehicle.upsert({
      where: { slug: v.slug },
      update: {},
      create: { ...v },
    });
    console.log(`  ✓ ${v.title}`);
  }

  console.log('✅ Seed complete.');
  console.log('   Vehicle images are empty — upload real photos via the Admin Media Library.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
