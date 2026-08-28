export default function registerCooperativesRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction }) {
  // Get all cooperatives
  app.get('/api/cooperatives', authenticate, async (req, res) => {
    try {
      const cooperatives = await prisma.cooperative.findMany({
        include: {
          _count: { select: { members: true } }
        },
        orderBy: { nom: 'asc' }
      });
      res.json(cooperatives);
    } catch (error) {
      console.error('Erreur récupération coopératives:', error);
      res.status(500).json({ error: 'Failed to fetch cooperatives' });
    }
  });

  // Get cooperative by ID
  app.get('/api/cooperatives/:id', authenticate, async (req, res) => {
    try {
      const cooperative = await prisma.cooperative.findUnique({
        where: { id: req.params.id },
        include: {
          members: {
            where: { actif: true },
            include: { operations: true }
          }
        }
      });
      if (!cooperative) {
        return res.status(404).json({ error: 'Cooperative not found' });
      }

      // Calculer le solde total de la coopérative
      let soldeTotal = 0;
      cooperative.members.forEach(member => {
        member.operations.forEach(op => {
          if (op.typeOperation === 'vente' || op.typeOperation === 'depense') {
            soldeTotal += op.montant;
          } else if (op.typeOperation === 'paiement' || op.typeOperation === 'avance') {
            soldeTotal -= op.montant;
          }
        });
      });

      res.json({ ...cooperative, soldeTotal });
    } catch (error) {
      console.error('Erreur récupération coopérative:', error);
      res.status(500).json({ error: 'Failed to fetch cooperative' });
    }
  });

  // Create cooperative
  app.post('/api/cooperatives', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const { nom, telephone, email, adresse, president, description } = req.body;
      const cooperative = await prisma.cooperative.create({
        data: { nom, telephone, email, adresse, president, description }
      });
      await logAction(req.user.id, 'CREATE', 'COOPERATIVE', { nom: cooperative.nom });
      res.json(cooperative);
    } catch (error) {
      console.error('Erreur création coopérative:', error);
      res.status(500).json({ error: 'Failed to create cooperative' });
    }
  });

  // Update cooperative
  app.put('/api/cooperatives/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const cooperative = await prisma.cooperative.update({
        where: { id: req.params.id },
        data: req.body
      });
      await logAction(req.user.id, 'UPDATE', 'COOPERATIVE', { id: cooperative.id, nom: cooperative.nom });
      res.json(cooperative);
    } catch (error) {
      console.error('Erreur modification coopérative:', error);
      res.status(500).json({ error: 'Failed to update cooperative' });
    }
  });

  // Delete cooperative
  app.delete('/api/cooperatives/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const cooperative = await prisma.cooperative.delete({
        where: { id: req.params.id }
      });
      await logAction(req.user.id, 'DELETE', 'COOPERATIVE', { id: cooperative.id, nom: cooperative.nom });
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression coopérative:', error);
      res.status(500).json({ error: 'Failed to delete cooperative' });
    }
  });
}
