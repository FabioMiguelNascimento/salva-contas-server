import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set — the seed will attempt to use the environment or .env.');
}

const prisma: PrismaClient = new PrismaService();

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

  console.log(`Seeding ${categories.length} global categories...`);

  let removedDuplicates = 0;
  for (const c of categories) {
    const rows = await prisma.category.findMany({ where: { userId: null, name: c.name }, orderBy: { id: 'asc' } });
    if (rows.length > 1) {
      const idsToDelete = rows.slice(1).map((r) => r.id);
      const del = await prisma.category.deleteMany({ where: { id: { in: idsToDelete } } });
      removedDuplicates += del.count ?? 0;
    }
  }

  const existingGlobal = await prisma.category.findMany({ where: { userId: null }, select: { id: true, name: true } });
  const existingNames = new Set(existingGlobal.map((r) => r.name));

  const nameToId = new Map(existingGlobal.map((r) => [r.name, r.id]));

  const ops = categories.map((c) =>
    nameToId.has(c.name)
      ? prisma.category.update({
          where: { id: nameToId.get(c.name)! },
          data: { icon: c.icon, isGlobal: true },
        })
      : prisma.category.create({
          data: { userId: null, name: c.name, icon: c.icon, isGlobal: true },
        })
  );

  await prisma.$transaction(ops);

  const created = categories.filter((c) => !existingNames.has(c.name)).length;
  const updated = categories.length - created;

  console.log(`Seed completed. created: ${created}, updated: ${updated}, duplicates removed: ${removedDuplicates}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
