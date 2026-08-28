import { validate, expenseSchema } from '../validators.js';

export default function registerExpensesRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, getDateFilter, notificationService }) {
  app.get('/api/expenses', authenticate, authorize(['GERANT']), async (req, res) => {
    const { speculationId, startDate, endDate } = req.query;
    try {
      const where = {
        date: getDateFilter(startDate, endDate)
      };
      if (speculationId) where.speculationId = String(speculationId);

      const expenses = await prisma.expense.findMany({
        where,
        include: { speculation: true },
        orderBy: { date: 'desc' }
      });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  });

  app.post('/api/expenses', authenticate, authorize(['GERANT']), validate(expenseSchema), async (req, res) => {
    try {
      const expense = await prisma.expense.create({
        data: {
          ...req.body,
          date: new Date(req.body.date),
          amount: parseFloat(req.body.amount),
          speculationId: req.body.speculationId || null,
        }
      });
      await logAction(req.user.id, 'CREATE', 'EXPENSE', { category: expense.category, amount: expense.amount });

      // Envoyer notification WhatsApp au compte connecté
      const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
      if (adminNumber) {
        const adminMessage = `💸 NOUVELLE DÉPENSE\n\nCatégorie: ${expense.category}\nType: ${expense.type}\nMontant: ${expense.amount.toLocaleString()} FCFA\nDate: ${new Date(expense.date).toLocaleDateString('fr-FR')}\n${expense.speculationId ? `Spéculation: ${expense.speculationId}` : ''}\n${expense.observation ? `Note: ${expense.observation}` : ''}`;
        notificationService.sendWhatsAppMessage(adminNumber, adminMessage).catch(err => console.error('Erreur notification dépense:', err));
      }

      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create expense' });
    }
  });

  app.put('/api/expenses/:id', authenticate, async (req, res) => {
    try {
      const expense = await prisma.expense.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          date: new Date(req.body.date),
          amount: parseFloat(req.body.amount),
          speculationId: req.body.speculationId || null,
        }
      });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update expense' });
    }
  });

  app.delete('/api/expenses/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      await prisma.expense.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });
}
