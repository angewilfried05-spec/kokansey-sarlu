import { validate, clientSchema, operationClientSchema } from '../validators.js';

function calculerImpact(typeOperation, montant) {
  if (typeOperation === 'vente' || typeOperation === 'depense') return montant;
  if (typeOperation === 'paiement' || typeOperation === 'avance') return -montant;
  return 0;
}

function calculerSolde(operations) {
  return operations.reduce((solde, op) => solde + calculerImpact(op.typeOperation, op.montant), 0);
}

export default function registerClientOperationsRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction }) {
  app.get('/api/clients', authenticate, async (req, res) => {
    const { search, actif } = req.query;
    try {
      const where = {};
      if (search) {
        where.OR = [
          { nom: { contains: search } },
          { telephone: { contains: search } },
          { email: { contains: search } }
        ];
      }
      if (actif !== undefined) {
        where.actif = actif === 'true';
      }

      const clients = await prisma.client.findMany({
        where,
        include: {
          _count: { select: { operations: true } }
        },
        orderBy: { nom: 'asc' }
      });

      const clientsAvecSolde = await Promise.all(clients.map(async (client) => {
        const operations = await prisma.operationClient.findMany({
          where: { clientId: client.id }
        });
        return { ...client, solde: calculerSolde(operations) };
      }));

      res.json(clientsAvecSolde);
    } catch (error) {
      console.error('Erreur récupération clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  app.get('/api/clients/:id', authenticate, async (req, res) => {
    try {
      const client = await prisma.client.findUnique({
        where: { id: req.params.id },
        include: {
          _count: { select: { operations: true } }
        }
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const operations = await prisma.operationClient.findMany({
        where: { clientId: client.id }
      });

      res.json({ ...client, solde: calculerSolde(operations) });
    } catch (error) {
      console.error('Erreur récupération client:', error);
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  });

  app.post('/api/clients', authenticate, authorize(['GERANT']), validate(clientSchema), async (req, res) => {
    try {
      const client = await prisma.client.create({ data: req.body });
      await logAction(req.user.id, 'CREATE', 'CLIENT', { nom: client.nom });
      res.json(client);
    } catch (error) {
      console.error('Erreur création client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  app.put('/api/clients/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const client = await prisma.client.update({
        where: { id: req.params.id },
        data: req.body
      });
      await logAction(req.user.id, 'UPDATE', 'CLIENT', { id: client.id, nom: client.nom });
      res.json(client);
    } catch (error) {
      console.error('Erreur modification client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  app.get('/api/clients/:id/operations', authenticate, async (req, res) => {
    const { date_debut, date_fin, type_operation } = req.query;
    try {
      const clientId = req.params.id;

      let soldeInitial = 0;
      if (date_debut) {
        const operationsAnterieures = await prisma.operationClient.findMany({
          where: {
            clientId,
            dateOperation: { lt: new Date(date_debut) }
          },
          orderBy: { dateOperation: 'asc' }
        });
        soldeInitial = calculerSolde(operationsAnterieures);
      }

      const where = { clientId };
      if (date_debut || date_fin) {
        where.dateOperation = {};
        if (date_debut) where.dateOperation.gte = new Date(date_debut);
        if (date_fin) {
          const fin = new Date(date_fin);
          fin.setHours(23, 59, 59, 999);
          where.dateOperation.lte = fin;
        }
      }
      if (type_operation) {
        where.typeOperation = type_operation;
      }

      const operations = await prisma.operationClient.findMany({
        where,
        orderBy: [{ dateOperation: 'asc' }, { createdAt: 'asc' }]
      });

      let soldeCourant = soldeInitial;
      const operationsAvecSolde = operations.map(op => {
        soldeCourant += calculerImpact(op.typeOperation, op.montant);
        return { ...op, soldeApresOperation: soldeCourant };
      });

      res.json({
        soldeInitial,
        soldeActuel: soldeCourant,
        operations: operationsAvecSolde
      });
    } catch (error) {
      console.error('Erreur récupération opérations:', error);
      res.status(500).json({ error: 'Failed to fetch operations' });
    }
  });

  app.post('/api/clients/:id/operations', authenticate, authorize(['GERANT', 'COMMERCIAL']), validate(operationClientSchema), async (req, res) => {
    try {
      // Bloquer la saisie manuelle du type "vente" - réservé aux ventes agricoles
      if (req.body.typeOperation === 'vente') {
        return res.status(400).json({
          error: 'Le type "vente" est réservé aux ventes agricoles. Utilisez le formulaire de vente pour enregistrer une transaction.'
        });
      }

      const operation = await prisma.operationClient.create({
        data: {
          ...req.body,
          clientId: req.params.id,
          dateOperation: new Date(req.body.dateOperation),
          creePar: req.user.username
        }
      });
      await logAction(req.user.id, 'CREATE', 'OPERATION_CLIENT', {
        type: operation.typeOperation,
        montant: operation.montant
      });
      res.json(operation);
    } catch (error) {
      console.error('Erreur création opération:', error);
      res.status(500).json({ error: 'Failed to create operation' });
    }
  });

  app.put('/api/operations/:operationId', authenticate, authorize(['GERANT']), validate(operationClientSchema.partial()), async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.dateOperation) {
        data.dateOperation = new Date(data.dateOperation);
      }
      const operation = await prisma.operationClient.update({
        where: { id: req.params.operationId },
        data
      });
      await logAction(req.user.id, 'UPDATE', 'OPERATION_CLIENT', { id: operation.id });
      res.json(operation);
    } catch (error) {
      console.error('Erreur modification opération:', error);
      res.status(500).json({ error: 'Failed to update operation' });
    }
  });

  app.delete('/api/operations/:operationId', authenticate, checkAdmin, async (req, res) => {
    try {
      const operation = await prisma.operationClient.delete({
        where: { id: req.params.operationId }
      });
      await logAction(req.user.id, 'DELETE', 'OPERATION_CLIENT', { id: operation.id });
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression opération:', error);
      res.status(500).json({ error: 'Failed to delete operation' });
    }
  });
}
