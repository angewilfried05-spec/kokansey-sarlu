import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Create default user
  const adminUsername = process.env.ADMIN_USERNAME || 'KOKANSEY GROUP';
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = crypto.randomBytes(9).toString('base64url');
    console.log(`Mot de passe admin généré (à changer à la première connexion) : ${adminPassword}`);
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: hashedPassword,
      name: process.env.ADMIN_NAME || 'Administrateur',
      role: 'ADMIN',
    },
  });

  // Initial Speculations
  const speculations = [
    // Cultures Industrielles
    { name: 'Hévéa', category: 'Cultures Industrielles' },
    { name: 'Cacao', category: 'Cultures Industrielles' },
    { name: 'Palmier à huile', category: 'Cultures Industrielles' },
    // Cultures Vivrières
    { name: 'Maïs', category: 'Cultures Vivrières' },
    { name: 'Riz', category: 'Cultures Vivrières' },
    { name: 'Igname', category: 'Cultures Vivrières' },
    { name: 'Manioc', category: 'Cultures Vivrières' },
    { name: 'Arachides', category: 'Cultures Vivrières' },
    { name: 'Gombo', category: 'Cultures Vivrières' },
    { name: 'Piment', category: 'Cultures Vivrières' },
    { name: 'Papaye', category: 'Cultures Vivrières' },
    { name: 'Aubergine', category: 'Cultures Vivrières' },
    { name: 'Banane plantain', category: 'Cultures Vivrières' },
    // Elevage
    { name: 'Canards', category: 'Elevage' },
    { name: 'Poules pondeuses', category: 'Elevage' },
    { name: 'Poules hybrides', category: 'Elevage' },
    { name: 'Porcs', category: 'Elevage' },
  ];

  for (const spec of speculations) {
    await prisma.speculation.upsert({
      where: { name: spec.name },
      update: { category: spec.category },
      create: spec,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
