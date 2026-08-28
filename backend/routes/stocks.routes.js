import { validate, stockSchema } from '../validators.js';

export default function registerStocksRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, notificationService }) {
  app.get('/api/stocks', authenticate, authorize(['GERANT', 'STOCK_MANAGER', 'COMMERCIAL']), async (req, res) => {
    try {
      const stocks = await prisma.stock.findMany({
        include: {
          speculation: true,
          _count: { select: { movements: true } },
          movements: true
        }
      });
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stocks' });
    }
  });

  app.get('/api/stocks/movements', authenticate, authorize(['GERANT', 'STOCK_MANAGER', 'COMMERCIAL']), async (req, res) => {
    try {
      const movements = await prisma.stockMovement.findMany({
        include: { stock: true },
        orderBy: { date: 'desc' }
      });
      res.json(movements);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.post('/api/stocks', authenticate, authorize(['GERANT', 'STOCK_MANAGER']), validate(stockSchema), async (req, res) => {
    try {
      const stock = await prisma.stock.create({
        data: {
          ...req.body,
          quantity: parseFloat(req.body.quantity || 0),
          minThreshold: parseFloat(req.body.minThreshold || 0),
          speculationId: req.body.speculationId || null,
        }
      });
      await logAction(req.user.id, 'CREATE', 'STOCK', { name: stock.name, quantity: stock.quantity });
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create stock item' });
    }
  });

  app.put('/api/stocks/:id', authenticate, authorize(['GERANT', 'STOCK_MANAGER']), validate(stockSchema), async (req, res) => {
    try {
      const stock = await prisma.stock.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          quantity: req.body.quantity ? parseFloat(req.body.quantity) : undefined,
          minThreshold: req.body.minThreshold ? parseFloat(req.body.minThreshold) : undefined,
          speculationId: req.body.speculationId || null,
        }
      });
      await logAction(req.user.id, 'UPDATE', 'STOCK', { id: stock.id, name: stock.name });
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update stock item' });
    }
  });

  app.delete('/api/stocks/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const stock = await prisma.stock.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'STOCK', { id: stock.id, name: stock.name });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete stock item' });
    }
  });

  app.get('/api/stocks/:id/details', authenticate, async (req, res) => {
    try {
      const stock = await prisma.stock.findUnique({
        where: { id: req.params.id },
        include: {
          movements: {
            include: { speculation: true },
            orderBy: { date: 'desc' }
          }
        }
      });
      res.json(stock);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stock details' });
    }
  });

  app.post('/api/stocks/:id/movements', authenticate, async (req, res) => {
    const { type, quantity, date, reason, speculationId } = req.body;
    const qty = parseFloat(quantity);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create movement
        const movement = await tx.stockMovement.create({
          data: {
            stockId: req.params.id,
            type,
            quantity: qty,
            date: new Date(date),
            reason,
            speculationId: speculationId || null
          }
        });

        // 2. Update stock quantity
        const stock = await tx.stock.update({
          where: { id: req.params.id },
          data: {
            quantity: {
              [type === 'IN' ? 'increment' : 'decrement']: qty
            }
          }
        });

        return { movement, stock };
      });

      // Envoyer notification WhatsApp au compte connecté
      const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
      if (adminNumber) {
        const typeLabel = type === 'IN' ? 'ENTRÉE' : 'SORTIE';
        const emoji = type === 'IN' ? '📥' : '📤';
        const adminMessage = `${emoji} MOUVEMENT DE STOCK\n\nProduit: ${result.stock.name}\nType: ${typeLabel}\nQuantité: ${qty} ${result.stock.unit}\nDate: ${new Date(date).toLocaleDateString('fr-FR')}\n${reason ? `Raison: ${reason}` : ''}`;
        notificationService.sendWhatsAppMessage(adminNumber, adminMessage).catch(err => console.error('Erreur notification stock:', err));
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record movement' });
    }
  });

  app.delete('/api/stocks/movements/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const movement = await tx.stockMovement.findUnique({
          where: { id: req.params.id }
        });

        if (!movement) throw new Error("Mouvement non trouvé");

        // Update stock quantity (revert the movement)
        await tx.stock.update({
          where: { id: movement.stockId },
          data: {
            quantity: {
              [movement.type === 'IN' ? 'decrement' : 'increment']: movement.quantity
            }
          }
        });

        // Delete the movement
        return await tx.stockMovement.delete({
          where: { id: req.params.id }
        });
      });

      await logAction(req.user.id, 'DELETE', 'STOCK_MOVEMENT', { id: req.params.id });
      res.json({ success: true, result });
    } catch (error) {
      console.error("Delete Movement Error:", error);
      res.status(500).json({ error: 'Failed to delete movement and update stock' });
    }
  });
}
