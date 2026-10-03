import { PrismaClient } from '@prisma/client';

export default function registerMonthlyRoutes(app, { prisma, authenticate, logAction }) {
  // Get current month counter
  app.get('/api/monthly/counter', authenticate, async (req, res) => {
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      let counter = await prisma.monthlyCounter.findUnique({
        where: { month: monthKey }
      });

      if (!counter) {
        counter = await prisma.monthlyCounter.create({
          data: {
            month: monthKey,
            year: now.getFullYear(),
            monthNumber: now.getMonth() + 1,
            salesCount: 0,
            expensesCount: 0,
            stockMovementsCount: 0,
            harvestsCount: 0,
            totalSalesAmount: 0,
            totalExpensesAmount: 0
          }
        });
      }

      res.json(counter);
    } catch (error) {
      console.error('Error fetching monthly counter:', error);
      res.status(500).json({ error: 'Failed to fetch monthly counter' });
    }
  });

  // Get all monthly counters
  app.get('/api/monthly/counters', authenticate, async (req, res) => {
    try {
      const counters = await prisma.monthlyCounter.findMany({
        orderBy: { month: 'desc' },
        take: 12
      });
      res.json(counters);
    } catch (error) {
      console.error('Error fetching monthly counters:', error);
      res.status(500).json({ error: 'Failed to fetch monthly counters' });
    }
  });

  // Reset monthly counter
  app.post('/api/monthly/reset', authenticate, async (req, res) => {
    try {
      const { month, notes } = req.body;
      const userId = req.user.id;

      const now = new Date();
      const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const counter = await prisma.monthlyCounter.upsert({
        where: { month: monthKey },
        update: {
          salesCount: 0,
          expensesCount: 0,
          stockMovementsCount: 0,
          harvestsCount: 0,
          totalSalesAmount: 0,
          totalExpensesAmount: 0,
          notes: notes || null,
          resetAt: new Date(),
          resetBy: userId
        },
        create: {
          month: monthKey,
          year: parseInt(monthKey.split('-')[0]),
          monthNumber: parseInt(monthKey.split('-')[1]),
          salesCount: 0,
          expensesCount: 0,
          stockMovementsCount: 0,
          harvestsCount: 0,
          totalSalesAmount: 0,
          totalExpensesAmount: 0,
          notes: notes || null,
          resetAt: new Date(),
          resetBy: userId
        }
      });

      await logAction(userId, 'RESET', 'MONTHLY_COUNTER', { month: monthKey });

      res.json(counter);
    } catch (error) {
      console.error('Error resetting monthly counter:', error);
      res.status(500).json({ error: 'Failed to reset monthly counter' });
    }
  });

  // Get monthly journal
  app.get('/api/monthly/journal', authenticate, async (req, res) => {
    try {
      const { month } = req.query;

      const where = month ? { month: String(month) } : {};

      const journal = await prisma.monthlyJournal.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 100
      });

      res.json(journal);
    } catch (error) {
      console.error('Error fetching monthly journal:', error);
      res.status(500).json({ error: 'Failed to fetch monthly journal' });
    }
  });

  // Add journal entry
  app.post('/api/monthly/journal', authenticate, async (req, res) => {
    try {
      const { month, type, description, amount, metadata } = req.body;
      const userId = req.user.id;

      const now = new Date();
      const monthKey = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const entry = await prisma.monthlyJournal.create({
        data: {
          month: monthKey,
          type,
          description,
          amount: amount || null,
          metadata: metadata ? JSON.stringify(metadata) : null
        }
      });

      await logAction(userId, 'CREATE', 'MONTHLY_JOURNAL', { type, description });

      res.json(entry);
    } catch (error) {
      console.error('Error creating journal entry:', error);
      res.status(500).json({ error: 'Failed to create journal entry' });
    }
  });

  // Increment counter (internal helper, called by other routes)
  app.post('/api/monthly/increment', authenticate, async (req, res) => {
    try {
      const { type, amount } = req.body;
      
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const counter = await prisma.monthlyCounter.upsert({
        where: { month: monthKey },
        create: {
          month: monthKey,
          year: now.getFullYear(),
          monthNumber: now.getMonth() + 1,
          salesCount: type === 'SALE' ? 1 : 0,
          expensesCount: type === 'EXPENSE' ? 1 : 0,
          stockMovementsCount: type === 'STOCK' ? 1 : 0,
          harvestsCount: type === 'HARVEST' ? 1 : 0,
          totalSalesAmount: type === 'SALE' ? (amount || 0) : 0,
          totalExpensesAmount: type === 'EXPENSE' ? (amount || 0) : 0
        },
        update: {
          ...(type === 'SALE' && { salesCount: { increment: 1 }, totalSalesAmount: { increment: amount || 0 } }),
          ...(type === 'EXPENSE' && { expensesCount: { increment: 1 }, totalExpensesAmount: { increment: amount || 0 } }),
          ...(type === 'STOCK' && { stockMovementsCount: { increment: 1 } }),
          ...(type === 'HARVEST' && { harvestsCount: { increment: 1 } })
        }
      });

      res.json(counter);
    } catch (error) {
      console.error('Error incrementing counter:', error);
      res.status(500).json({ error: 'Failed to increment counter' });
    }
  });
}
