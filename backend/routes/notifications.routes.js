export default function registerNotificationsRoutes(app, { prisma, authenticate }) {
  app.get('/api/notifications', authenticate, async (req, res) => {
    try {
      const notifications = [];
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // 1. Speculations avec dépenses supérieures aux revenus
      const speculations = await prisma.speculation.findMany({
        include: { sales: true, expenses: true }
      });
      for (const spec of speculations) {
        const rev = spec.sales.reduce((a, b) => a + b.totalPrice, 0);
        const exp = spec.expenses.reduce((a, b) => a + b.amount, 0);
        if (exp > rev && exp > 0) {
          notifications.push({
            id: `profit-${spec.id}`,
            type: 'danger',
            title: `Rentabilité : ${spec.name}`,
            message: `Dépenses (${exp.toLocaleString()} FCFA) > Revenus (${rev.toLocaleString()} FCFA).`,
            date: now.toISOString()
          });
        }
      }

      // 2. Rappel fin de mois paie
      if (now.getDate() >= 25) {
        notifications.push({
          id: 'salary-period',
          type: 'info',
          title: 'Période de paie',
          message: 'Pensez à préparer les fiches de paie.',
          date: now.toISOString()
        });
      }

      // 3. Stocks bas
      const stocks = await prisma.stock.findMany();
      for (const stock of stocks) {
        if (stock.quantity <= stock.minThreshold) {
          notifications.push({
            id: `stock-${stock.id}`,
            type: 'warning',
            title: `Stock bas : ${stock.name}`,
            message: `Quantité critique : ${stock.quantity} ${stock.unit} restant(s).`,
            date: now.toISOString()
          });
        }
      }

      // 4. Maintenance camions
      const trucks = await prisma.truck.findMany({
        include: { expenses: { where: { type: { in: ['Entretien', 'Réparation'] } }, orderBy: { date: 'desc' }, take: 1 } }
      });
      for (const truck of trucks) {
        const lastMaint = truck.expenses[0];
        if (!lastMaint || new Date(lastMaint.date) < threeMonthsAgo) {
          notifications.push({
            id: `maint-${truck.id}`,
            type: 'warning',
            title: `Maintenance : ${truck.registration}`,
            message: lastMaint
              ? `Dernier entretien le ${new Date(lastMaint.date).toLocaleDateString('fr-FR')}.`
              : 'Aucun entretien enregistré.',
            date: now.toISOString()
          });
        }
      }

      // 5. Clients en dépassement de seuil
      const clients = await prisma.client.findMany({
        where: { actif: true },
        include: { operations: true }
      });
      const seuilDepassement = 500000;
      for (const client of clients) {
        let solde = 0;
        for (const op of client.operations) {
          if (op.typeOperation === 'vente' || op.typeOperation === 'depense') solde += op.montant;
          else if (op.typeOperation === 'paiement' || op.typeOperation === 'avance') solde -= op.montant;
        }
        if (solde > seuilDepassement) {
          notifications.push({
            id: `client-seuil-${client.id}`,
            type: 'danger',
            title: `Créance élevée : ${client.nom}`,
            message: `Solde de ${solde.toLocaleString()} FCFA dépasse le seuil.`,
            date: now.toISOString()
          });
        }
      }

      // 6. Tâches à échéance proche
      const tasks = await prisma.task.findMany({
        where: {
          status: { not: 'COMPLETED' },
          dueDate: { lte: nextWeek }
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      });
      for (const task of tasks) {
        notifications.push({
          id: `task-${task.id}`,
          type: 'warning',
          title: `Tâche urgente : ${task.title}`,
          message: task.dueDate
            ? `Échéance le ${new Date(task.dueDate).toLocaleDateString('fr-FR')}.`
            : 'Tâche en retard.',
          date: task.dueDate ? new Date(task.dueDate).toISOString() : now.toISOString()
        });
      }

      res.json(notifications);
    } catch (error) {
      console.error('Notifications Error:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });
}
