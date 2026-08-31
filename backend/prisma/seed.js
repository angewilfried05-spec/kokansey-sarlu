import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Import data from exported-data.json if it exists
  const dataPath = path.join(__dirname, 'exported-data.json');
  if (fs.existsSync(dataPath)) {
    console.log('Importing data from exported-data.json...');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Import in order to respect foreign keys
    // 1. Speculations
    for (const spec of data.Speculation || []) {
      await prisma.speculation.upsert({
        where: { name: spec.name },
        update: spec,
        create: spec,
      });
    }
    console.log(`Imported ${data.Speculation?.length || 0} speculations`);

    // 2. Clients
    for (const client of data.Client || []) {
      await prisma.client.upsert({
        where: { id: client.id },
        update: client,
        create: client,
      });
    }
    console.log(`Imported ${data.Client?.length || 0} clients`);

    // 3. Campagnes
    for (const campagne of data.Campagne || []) {
      await prisma.campagne.upsert({
        where: { id: campagne.id },
        update: campagne,
        create: campagne,
      });
    }
    console.log(`Imported ${data.Campagne?.length || 0} campagnes`);

    // 4. Employees
    for (const employee of data.Employee || []) {
      await prisma.employee.upsert({
        where: { id: employee.id },
        update: employee,
        create: employee,
      });
    }
    console.log(`Imported ${data.Employee?.length || 0} employees`);

    // 5. Trucks
    for (const truck of data.Truck || []) {
      await prisma.truck.upsert({
        where: { id: truck.id },
        update: truck,
        create: truck,
      });
    }
    console.log(`Imported ${data.Truck?.length || 0} trucks`);

    // 6. Harvests
    for (const harvest of data.Harvest || []) {
      await prisma.harvest.upsert({
        where: { id: harvest.id },
        update: harvest,
        create: harvest,
      });
    }
    console.log(`Imported ${data.Harvest?.length || 0} harvests`);

    // 7. Invoices (must be before Sales due to foreign key)
    for (const invoice of data.Invoice || []) {
      await prisma.invoice.upsert({
        where: { id: invoice.id },
        update: invoice,
        create: invoice,
      });
    }
    console.log(`Imported ${data.Invoice?.length || 0} invoices`);

    // 8. Sales
    for (const sale of data.Sale || []) {
      await prisma.sale.upsert({
        where: { id: sale.id },
        update: sale,
        create: sale,
      });
    }
    console.log(`Imported ${data.Sale?.length || 0} sales`);

    // 9. Tasks
    for (const task of data.Task || []) {
      await prisma.task.upsert({
        where: { id: task.id },
        update: task,
        create: task,
      });
    }
    console.log(`Imported ${data.Task?.length || 0} tasks`);

    // 10. Expenses
    for (const expense of data.Expense || []) {
      await prisma.expense.upsert({
        where: { id: expense.id },
        update: expense,
        create: expense,
      });
    }
    console.log(`Imported ${data.Expense?.length || 0} expenses`);

    // 11. Stocks
    for (const stock of data.Stock || []) {
      await prisma.stock.upsert({
        where: { id: stock.id },
        update: stock,
        create: stock,
      });
    }
    console.log(`Imported ${data.Stock?.length || 0} stocks`);
  } else {
    // Initial Speculations (fallback if no export data)
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
