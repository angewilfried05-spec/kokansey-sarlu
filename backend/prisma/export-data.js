import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function exportData() {
  const data = {};

  // Export all tables
  const tables = [
    'User',
    'Speculation',
    'Client',
    'Cooperative',
    'Sale',
    'Harvest',
    'Campagne',
    'Export',
    'Invoice',
    'Task',
    'Notification',
    'Expense',
    'Employee',
    'Truck',
    'Stock'
  ];

  for (const table of tables) {
    try {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      const result = await prisma[modelName].findMany();
      data[table] = result;
      console.log(`Exported ${result.length} records from ${table}`);
    } catch (error) {
      console.error(`Error exporting ${table}:`, error.message);
      data[table] = [];
    }
  }

  // Save to file
  fs.writeFileSync('exported-data.json', JSON.stringify(data, null, 2));
  console.log('Data exported to exported-data.json');
}

exportData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
