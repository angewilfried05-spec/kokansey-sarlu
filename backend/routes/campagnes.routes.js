export default function registerCampagnesRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction }) {
  // Get all campagnes
  app.get('/api/campagnes', authenticate, async (req, res) => {
    try {
      const campagnes = await prisma.campagne.findMany({
        orderBy: { dateDebut: 'desc' }
      });
      res.json(campagnes);
    } catch (error) {
      console.error('Erreur récupération campagnes:', error);
      res.status(500).json({ error: 'Failed to fetch campagnes' });
    }
  });

  // Get campagne by ID
  app.get('/api/campagnes/:id', authenticate, async (req, res) => {
    try {
      const campagne = await prisma.campagne.findUnique({
        where: { id: req.params.id },
        include: {
          harvests: { include: { speculation: true } },
          sales: { include: { speculation: true } }
        }
      });
      if (!campagne) {
        return res.status(404).json({ error: 'Campagne not found' });
      }
      res.json(campagne);
    } catch (error) {
      console.error('Erreur récupération campagne:', error);
      res.status(500).json({ error: 'Failed to fetch campagne' });
    }
  });

  // Create campagne
  app.post('/api/campagnes', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const { nom, description, dateDebut, dateFin } = req.body;
      const campagne = await prisma.campagne.create({
        data: { nom, description, dateDebut: new Date(dateDebut), dateFin: new Date(dateFin) }
      });
      await logAction(req.user.id, 'CREATE', 'CAMPAGNE', { nom: campagne.nom });
      res.json(campagne);
    } catch (error) {
      console.error('Erreur création campagne:', error);
      res.status(500).json({ error: 'Failed to create campagne' });
    }
  });

  // Update campagne
  app.put('/api/campagnes/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const campagne = await prisma.campagne.update({
        where: { id: req.params.id },
        data: req.body
      });
      await logAction(req.user.id, 'UPDATE', 'CAMPAGNE', { id: campagne.id, nom: campagne.nom });
      res.json(campagne);
    } catch (error) {
      console.error('Erreur modification campagne:', error);
      res.status(500).json({ error: 'Failed to update campagne' });
    }
  });

  // Delete campagne
  app.delete('/api/campagnes/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const campagne = await prisma.campagne.delete({
        where: { id: req.params.id }
      });
      await logAction(req.user.id, 'DELETE', 'CAMPAGNE', { id: campagne.id, nom: campagne.nom });
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression campagne:', error);
      res.status(500).json({ error: 'Failed to delete campagne' });
    }
  });
}
