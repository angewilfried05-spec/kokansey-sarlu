import ExcelJS from 'exceljs';

export default function registerExportsRoutes(app, { prisma, authenticate, authorize }) {
  // Export Excel des comptes clients
  app.get('/api/clients/export/excel', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        where: { actif: true },
        include: { operations: true }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Comptes Clients');

      worksheet.columns = [
        { header: 'Client', key: 'nom', width: 30 },
        { header: 'Téléphone', key: 'telephone', width: 15 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Solde', key: 'solde', width: 15 },
        { header: 'Nombre d\'opérations', key: 'operationsCount', width: 20 }
      ];

      const clientsAvecSolde = clients.map(client => {
        let solde = 0;
        client.operations.forEach(op => {
          if (op.typeOperation === 'vente' || op.typeOperation === 'depense') {
            solde += op.montant;
          } else if (op.typeOperation === 'paiement' || op.typeOperation === 'avance') {
            solde -= op.montant;
          }
        });
        return { ...client, solde, operationsCount: client.operations.length };
      });

      clientsAvecSolde.forEach(client => {
        worksheet.addRow({
          nom: client.nom,
          telephone: client.telephone || '',
          email: client.email || '',
          solde: client.solde,
          operationsCount: client.operationsCount
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=comptes-clients.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Erreur export Excel:', error);
      res.status(500).json({ error: 'Failed to export Excel' });
    }
  });

  // Balance âgée des comptes clients
  app.get('/api/clients/export/balance-agee', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        where: { actif: true },
        include: { operations: { orderBy: { dateOperation: 'asc' } } }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Balance Âgée');

      worksheet.columns = [
        { header: 'Client', key: 'nom', width: 30 },
        { header: '0-30 jours', key: 'range0_30', width: 15 },
        { header: '31-60 jours', key: 'range31_60', width: 15 },
        { header: '61-90 jours', key: 'range61_90', width: 15 },
        { header: '> 90 jours', key: 'range90plus', width: 15 },
        { header: 'Total', key: 'total', width: 15 }
      ];

      const now = new Date();

      clients.forEach(client => {
        let range0_30 = 0;
        let range31_60 = 0;
        let range61_90 = 0;
        let range90plus = 0;
        let solde = 0;

        client.operations.forEach(op => {
          if (op.typeOperation === 'vente' || op.typeOperation === 'depense') {
            solde += op.montant;
          } else if (op.typeOperation === 'paiement' || op.typeOperation === 'avance') {
            solde -= op.montant;
          }
        });

        // Calculer la balance âgée basée sur la date de la dernière opération non payée
        const unpaidOps = client.operations.filter(op => op.typeOperation === 'vente' || op.typeOperation === 'depense');
        unpaidOps.forEach(op => {
          const daysDiff = Math.floor((now - new Date(op.dateOperation)) / (1000 * 60 * 60 * 24));
          if (daysDiff <= 30) range0_30 += op.montant;
          else if (daysDiff <= 60) range31_60 += op.montant;
          else if (daysDiff <= 90) range61_90 += op.montant;
          else range90plus += op.montant;
        });

        worksheet.addRow({
          nom: client.nom,
          range0_30,
          range31_60,
          range61_90,
          range90plus,
          total: solde
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=balance-agee.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Erreur export balance âgée:', error);
      res.status(500).json({ error: 'Failed to export aged balance' });
    }
  });
}
