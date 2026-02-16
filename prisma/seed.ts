import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set — the seed will attempt to use the environment or .env.');
}

const prisma: PrismaClient = new PrismaService();

const DEFAULT_USER_ID = 'system';

const categories = [
  { name: 'Alimentação', icon: 'coffee' },
  { name: 'Supermercado', icon: 'shopping-cart' },
  { name: 'Transporte', icon: 'car' },
  { name: 'Combustível', icon: 'truck' },
  { name: 'Moradia', icon: 'home' },
  { name: 'Contas', icon: 'file-text' },
  { name: 'Saúde', icon: 'heart' },
  { name: 'Educação', icon: 'book' },
  { name: 'Lazer', icon: 'film' },
  { name: 'Compras', icon: 'shopping-bag' },
  { name: 'Salário', icon: 'dollar-sign' },
  { name: 'Investimentos', icon: 'trending-up' },
  { name: 'Impostos', icon: 'file-text' },
  { name: 'Outros', icon: 'tag' },
];

async function main() {
  await prisma.$connect();

  console.log(`Seeding ${categories.length} categories for user "${DEFAULT_USER_ID}"...`);

  const data = categories.map((c) => ({ userId: DEFAULT_USER_ID, name: c.name, icon: c.icon, isGlobal: true }));

  const res = await prisma.category.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Seed completed. (created: ${res.count ?? 'unknown'})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
