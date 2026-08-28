// SQLite ne supporte pas `mode: 'insensitive'` (son LIKE est déjà insensible à la casse pour l'ASCII).
const IS_SQLITE = (process.env.DATABASE_URL || '').startsWith('file:');
const insensitive = (value) => IS_SQLITE ? { contains: value } : { contains: value, mode: 'insensitive' };

export default function registerSearchRoutes(app, { prisma, authenticate }) {
  app.get('/api/search', authenticate, async (req, res) => {
    try {
      const q = req.query.q;
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.json({
          speculations: [],
          employees: [],
          trucks: [],
          clients: [],
          stocks: [],
          tasks: []
        });
      }

      const query = q.trim();
      const take = 5;

      const [speculations, employees, trucks, clients, stocks, tasks] = await Promise.all([
        prisma.speculation.findMany({
          where: { name: insensitive(query) },
          take,
          select: { id: true, name: true, category: true, status: true }
        }),
        prisma.employee.findMany({
          where: {
            OR: [
              { firstName: insensitive(query) },
              { lastName: insensitive(query) },
              { cniNumber: insensitive(query) },
              { matricule: insensitive(query) }
            ]
          },
          take,
          select: { id: true, firstName: true, lastName: true, position: true, cniNumber: true }
        }),
        prisma.truck.findMany({
          where: {
            OR: [
              { registration: insensitive(query) },
              { internalCode: insensitive(query) },
              { brand: insensitive(query) }
            ]
          },
          take,
          select: { id: true, internalCode: true, registration: true, brand: true, model: true, status: true }
        }),
        prisma.client.findMany({
          where: { nom: insensitive(query) },
          take,
          select: { id: true, nom: true, telephone: true, email: true }
        }),
        prisma.stock.findMany({
          where: { name: insensitive(query) },
          take,
          select: { id: true, name: true, category: true, quantity: true, unit: true }
        }),
        prisma.task.findMany({
          where: { title: insensitive(query) },
          take,
          select: { id: true, title: true, status: true, priority: true, dueDate: true }
        })
      ]);

      res.json({ speculations, employees, trucks, clients, stocks, tasks });
    } catch (error) {
      console.error('Erreur recherche globale:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche' });
    }
  });
}
