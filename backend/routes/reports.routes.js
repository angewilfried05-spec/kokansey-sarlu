export default function registerReportsRoutes(app, { prisma, authenticate, authorize, getDateFilter }) {
  // Financial Reports
  app.get('/api/reports/summary', authenticate, async (req, res) => {
    try {
      // Ventes et dépenses du mois courant
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const sales = await prisma.sale.aggregate({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { totalPrice: true }
      });
      const expenses = await prisma.expense.aggregate({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true }
      });
      const employeesCount = await prisma.employee.count();

      // Calcul des créances clients
      const clients = await prisma.client.findMany({
        where: { actif: true },
        include: { operations: true }
      });

      let totalCreances = 0;
      const clientsAvecSolde = clients.map(client => {
        let solde = 0;
        client.operations.forEach(op => {
          if (op.typeOperation === 'vente' || op.typeOperation === 'depense') {
            solde += op.montant;
          } else if (op.typeOperation === 'paiement' || op.typeOperation === 'avance') {
            solde -= op.montant;
          }
        });
        if (solde > 0) totalCreances += solde;
        return { ...client, solde };
      });

      // Top 5 débiteurs
      const topDebiteurs = clientsAvecSolde
        .filter(c => c.solde > 0)
        .sort((a, b) => b.solde - a.solde)
        .slice(0, 5)
        .map(c => ({ nom: c.nom, solde: c.solde }));

      // Clients en dépassement de seuil (> 500 000 FCFA)
      const seuilDepassement = 500000;
      const clientsSeuil = clientsAvecSolde
        .filter(c => c.solde > seuilDepassement)
        .map(c => ({ nom: c.nom, solde: c.solde }));

      // Logic for Notifications/Alerts
      const notifications = [];

      // 1. Alert for low profitability speculations
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
            title: `Alerte Rentabilité : ${spec.name}`,
            message: `Les dépenses (${exp.toLocaleString()} FCFA) dépassent les revenus (${rev.toLocaleString()} FCFA).`,
            date: new Date().toISOString()
          });
        }
      }

      // 2. Alert for upcoming salaries (simulated check for end of month)
      if (now.getDate() >= 25) {
        notifications.push({
          id: 'salary-period',
          type: 'warning',
          title: 'Période de Paie',
          message: 'Nous sommes en fin de mois. Pensez à préparer les fiches de paie.',
          date: new Date().toISOString()
        });
      }

      // 3. Alert for low stock
      const allStocks = await prisma.stock.findMany();
      for (const stock of allStocks) {
        if (stock.quantity <= stock.minThreshold) {
          notifications.push({
            id: `stock-${stock.id}`,
            type: 'warning',
            title: `Alerte Stock : ${stock.name}`,
            message: `Niveau critique : ${stock.quantity} ${stock.unit} restant(s).`,
            date: new Date().toISOString()
          });
        }
      }

      // 4. Alert for truck maintenance (if no maintenance in last 3 months)
      const allTrucks = await prisma.truck.findMany({
        include: { expenses: { where: { type: { in: ['Entretien', 'Réparation'] } }, orderBy: { date: 'desc' }, take: 1 } }
      });

      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      for (const truck of allTrucks) {
        const lastMaint = truck.expenses[0];
        if (!lastMaint || new Date(lastMaint.date) < threeMonthsAgo) {
          notifications.push({
            id: `maint-${truck.id}`,
            type: 'warning',
            title: `Maintenance Camion : ${truck.registration}`,
            message: lastMaint
              ? `Dernier entretien le ${new Date(lastMaint.date).toLocaleDateString()}. Prévoyez une révision.`
              : `Aucun entretien enregistré. Prévoyez une révision initiale.`,
            date: new Date().toISOString()
          });
        }
      }

      // 5. Alert for clients exceeding threshold
      clientsSeuil.forEach(client => {
        notifications.push({
          id: `client-seuil-${client.nom}`,
          type: 'danger',
          title: `Client en dépassement : ${client.nom}`,
          message: `Créance de ${client.solde.toLocaleString()} FCFA dépasse le seuil de ${seuilDepassement.toLocaleString()} FCFA.`,
          date: new Date().toISOString()
        });
      });

      // 6. Chart Data (Last 6 months)
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        const mSales = await prisma.sale.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { totalPrice: true }
        });
        const mExpenses = await prisma.expense.aggregate({
          where: { date: { gte: start, lte: end } },
          _sum: { amount: true }
        });

        chartData.push({
          name: d.toLocaleDateString('fr-FR', { month: 'short' }),
          sales: mSales._sum.totalPrice || 0,
          expenses: mExpenses._sum.amount || 0
        });
      }

      res.json({
        totalSales: sales._sum.totalPrice || 0,
        totalExpenses: expenses._sum.amount || 0,
        netProfit: (sales._sum.totalPrice || 0) - (expenses._sum.amount || 0),
        employeesCount,
        totalCreances,
        topDebiteurs,
        clientsSeuil,
        notifications,
        chartData
      });
    } catch (error) {
      console.error('Erreur résumé dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  // Exploitation Accounts
  app.get('/api/accounts', authenticate, authorize(['GERANT']), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const dateFilter = getDateFilter(startDate, endDate);
      const speculations = await prisma.speculation.findMany({
        include: {
          sales: { where: dateFilter ? { date: dateFilter } : {} },
          expenses: { where: dateFilter ? { date: dateFilter } : {} },
        }
      });

      const report = speculations.map(spec => {
        const totalRevenue = spec.sales.reduce((acc, sale) => acc + sale.totalPrice, 0);
        const totalExpenses = spec.expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        // Calculate breakdown
        const expenseBreakdown = spec.expenses.reduce((acc, exp) => {
          acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
          return acc;
        }, {});

        return {
          id: spec.id,
          name: spec.name,
          category: spec.category,
          totalRevenue,
          totalExpenses,
          netProfit,
          roi: totalExpenses > 0 ? (netProfit / totalExpenses) : 0,
          expenseBreakdown,
          salesCount: spec.sales.length,
          expensesCount: spec.expenses.length
        };
      });

      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.get('/api/reports/activity', authenticate, async (req, res) => {
    try {
      const [sales, expenses, harvests, stockMovements] = await Promise.all([
        prisma.sale.findMany({ take: 5, orderBy: { date: 'desc' }, include: { speculation: true } }),
        prisma.expense.findMany({ take: 5, orderBy: { date: 'desc' }, include: { speculation: true } }),
        prisma.harvest.findMany({ take: 5, orderBy: { date: 'desc' }, include: { speculation: true } }),
        prisma.stockMovement.findMany({ take: 5, orderBy: { date: 'desc' }, include: { stock: true } })
      ]);

      const activities = [
        ...sales.map(s => ({ id: s.id, type: 'SALE', title: `Vente: ${s.product}`, amount: s.totalPrice, date: s.date, detail: s.speculation.name })),
        ...expenses.map(e => ({ id: e.id, type: 'EXPENSE', title: `Dépense: ${e.category}`, amount: e.amount, date: e.date, detail: e.speculation.name })),
        ...harvests.map(h => ({ id: h.id, type: 'HARVEST', title: `Récolte: ${h.quantity} ${h.unit}`, date: h.date, detail: h.speculation.name })),
        ...stockMovements.map(sm => ({ id: sm.id, type: 'STOCK', title: `Stock: ${sm.type === 'IN' ? '+' : '-'}${sm.quantity}`, date: sm.date, detail: sm.stock.name }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  // Export Routes
  app.get('/api/export/csv', authenticate, async (req, res) => {
    const { type, startDate, endDate } = req.query; // sales, expenses, operations
    try {
      let data = [];
      let headers = "";
      const dateFilter = getDateFilter(startDate, endDate);

      if (type === 'sales') {
        data = await prisma.sale.findMany({
          where: dateFilter ? { date: dateFilter } : {},
          include: { speculation: true }
        });
        headers = "Date,Spéculation,Produit,Quantité,Unité,Prix Unitaire,Total,Client\n";
        const csv = data.map(s => `${s.date.toISOString()},${s.speculation.name},${s.product},${s.quantity},${s.unit},${s.unitPrice},${s.totalPrice},${s.client || ''}`).join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('ventes.csv');
        return res.send(headers + csv);
      } else if (type === 'expenses') {
        data = await prisma.expense.findMany({
          where: dateFilter ? { date: dateFilter } : {},
          include: { speculation: true }
        });
        headers = "Date,Type,Catégorie,Spéculation,Montant,Fournisseur,Observation\n";
        const csv = data.map(e => `${e.date.toISOString()},${e.type},${e.category},${e.speculation?.name || 'Général'},${e.amount},${e.supplier || ''},${e.observation || ''}`).join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('depenses.csv');
        return res.send(headers + csv);
      } else if (type === 'stocks') {
        data = await prisma.stock.findMany();
        headers = "Désignation,Catégorie,Quantité,Unité,Seuil Alerte\n";
        const csv = data.map(s => `${s.name},${s.category},${s.quantity},${s.unit},${s.minThreshold}`).join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('stocks.csv');
        return res.send(headers + csv);
      } else if (type === 'employees') {
        data = await prisma.employee.findMany();
        headers = "Nom,Prénom,Poste,Salaire,Contact,Date Embauche,CNI\n";
        const csv = data.map(e => `${e.lastName},${e.firstName},${e.position},${e.salary},${e.contact},${e.hireDate.toISOString()},${e.cniNumber}`).join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('employes.csv');
        return res.send(headers + csv);
      } else if (type === 'trucks') {
        data = await prisma.truck.findMany({ include: { driver: true, conveyor: true } });
        headers = "Matricule,Marque,Modèle,Chauffeur,Convoyeur\n";
        const csv = data.map(t => `${t.registration},${t.brand},${t.model},${t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : ''},${t.conveyor ? `${t.conveyor.firstName} ${t.conveyor.lastName}` : ''}`).join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('camions.csv');
        return res.send(headers + csv);
      } else if (type === 'sage') {
        // Export au format Sage-Sari (PNM/CSV standard)
        const employees = await prisma.employee.findMany();
        headers = "Matricule;Nom;Prénom;Poste;SalaireBase;DateEmbauche;TypeContrat\n";
        const csv = employees.map(e => {
          const mat = e.matricule || `EMP${e.id.slice(-4)}`;
          const date = e.hireDate.toISOString().split('T')[0];
          return `${mat};${e.lastName};${e.firstName};${e.position};${e.salary};${date};${e.contractType || 'CDI'}`;
        }).join('\n');

        res.header('Content-Type', 'text/csv');
        res.attachment('export_sage_sari.csv');
        return res.send(headers + csv);
      } else if (type === 'sage-accounting') {
        // Export des écritures comptables pour Sage 100
        const salaries = await prisma.salaryHistory.findMany({ include: { employee: true } });
        headers = "Jour;Date;Compte;Référence;Libellé;Débit;Crédit\n";
        const csv = salaries.map(s => {
          const date = new Date(s.date);
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = date.toLocaleDateString('fr-FR').replace(/\//g, '');
          const ref = `PAIE_${date.getMonth()+1}_${date.getFullYear()}`;
          const libelle = `Salaire ${s.employee.lastName} ${s.employee.firstName}`;
          // Compte 641 pour les salaires, Compte 421 pour le personnel
          const entry1 = `${day};${formattedDate};641000;${ref};${libelle};${s.amount};0`;
          const entry2 = `${day};${formattedDate};421000;${ref};${libelle};0;${s.amount}`;
          return `${entry1}\n${entry2}`;
        }).join('\n');

        res.header('Content-Type', 'text/csv');
        res.attachment('ecritures_sage.csv');
        return res.send(headers + csv);
      }

      res.status(400).json({ error: 'Invalid export type' });
    } catch (error) {
      res.status(500).json({ error: 'Export failed' });
    }
  });
}
