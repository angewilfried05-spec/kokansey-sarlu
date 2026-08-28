import { validate, harvestSchema } from '../validators.js';

export default function registerHarvestsRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction }) {
  // Get all harvests
  app.get('/api/harvests', authenticate, async (req, res) => {
    try {
      const harvests = await prisma.harvest.findMany({
        include: { speculation: true },
        orderBy: { date: 'desc' }
      });
      res.json(harvests);
    } catch (error) {
      console.error('Erreur récupération récoltes:', error);
      res.status(500).json({ error: 'Failed to fetch harvests' });
    }
  });

  // Create harvest
  app.post('/api/harvests', authenticate, authorize(['GERANT', 'STOCK_MANAGER']), validate(harvestSchema), async (req, res) => {
    const { speculationId, quantity, date, unit, quality, observation, campagneId } = req.body;
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create harvest
        const harvest = await tx.harvest.create({
          data: {
            speculationId,
            quantity: parseFloat(quantity),
            date: new Date(date),
            unit,
            quality,
            observation,
            campagneId: campagneId || null
          },
          include: { speculation: true }
        });

        // 2. Check if there's a finished-product stock item linked to this speculation
        const stock = await tx.stock.findFirst({
          where: { speculationId, category: 'Produit Fini' }
        });

        if (stock) {
          // 3. Create stock movement (IN)
          await tx.stockMovement.create({
            data: {
              stockId: stock.id,
              type: 'IN',
              quantity: parseFloat(quantity),
              date: new Date(date),
              reason: `Récolte: ${harvest.id}`,
              speculationId
            }
          });

          // 4. Update stock quantity
          await tx.stock.update({
            where: { id: stock.id },
            data: {
              quantity: { increment: parseFloat(quantity) }
            }
          });
        } else {
          // Create new stock item if none exists
          const newStock = await tx.stock.create({
            data: {
              name: `${harvest.speculation?.name || 'Produit'} (Récolte)`,
              category: 'Produit Fini',
              speculationId,
              quantity: parseFloat(quantity),
              unit,
              minThreshold: 100
            }
          });

          await tx.stockMovement.create({
            data: {
              stockId: newStock.id,
              type: 'IN',
              quantity: parseFloat(quantity),
              date: new Date(date),
              reason: `Récolte initiale: ${harvest.id}`,
              speculationId
            }
          });
        }

        return harvest;
      });

      await logAction(req.user.id, 'CREATE', 'HARVEST', { speculationId, quantity });
      res.json(result);
    } catch (error) {
      console.error('Erreur création récolte:', error);
      res.status(500).json({ error: 'Failed to create harvest' });
    }
  });

  // Update harvest
  app.put('/api/harvests/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const harvest = await prisma.harvest.update({
        where: { id: req.params.id },
        data: req.body
      });
      await logAction(req.user.id, 'UPDATE', 'HARVEST', { id: harvest.id });
      res.json(harvest);
    } catch (error) {
      console.error('Erreur modification récolte:', error);
      res.status(500).json({ error: 'Failed to update harvest' });
    }
  });

  // Delete harvest
  app.delete('/api/harvests/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const harvest = await prisma.harvest.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'HARVEST', { id: harvest.id, speculation: harvest.speculationId });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete harvest' });
    }
  });
}
