export default function registerSpeculationsRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction }) {
  app.get('/api/speculations', authenticate, authorize(['GERANT', 'COMMERCIAL', 'STOCK_MANAGER', 'ADMIN']), async (req, res) => {
    try {
      const speculations = await prisma.speculation.findMany({
        include: {
          _count: { select: { sales: true, expenses: true, harvests: true } },
          harvests: true,
          sales: true,
          expenses: true
        }
      });
      res.json(speculations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.post('/api/speculations', authenticate, authorize(['GERANT', 'ADMIN']), async (req, res) => {
    try {
      const body = req.body;
      const speculation = await prisma.speculation.create({
        data: {
          name: body.name,
          category: body.category,
          areaSize: body.areaSize ? parseFloat(body.areaSize) : null,
        },
      });
      await logAction(req.user.id, 'CREATE', 'SPECULATION', { name: body.name });
      res.json(speculation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create speculation" });
    }
  });

  app.put('/api/speculations/:id', authenticate, authorize(['GERANT', 'ADMIN']), async (req, res) => {
    try {
      const body = req.body;
      const speculation = await prisma.speculation.update({
        where: { id: req.params.id },
        data: {
          name: body.name,
          category: body.category,
          areaSize: body.areaSize ? parseFloat(body.areaSize) : null,
          status: body.status,
        },
      });
      await logAction(req.user.id, 'UPDATE', 'SPECULATION', { id: req.params.id, name: body.name });
      res.json(speculation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update speculation" });
    }
  });

  app.delete('/api/speculations/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const speculation = await prisma.speculation.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'SPECULATION', { id: req.params.id, name: speculation.name });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete speculation" });
    }
  });
}
