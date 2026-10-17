export default function registerWhatsAppRoutes(app, { prisma, authenticate, authorize, checkAdmin, notificationService }) {
  // Notification Routes
  app.get('/api/notifications/status', authenticate, async (req, res) => {
    try {
      const status = notificationService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Status Error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  });

  app.post('/api/notifications/reconnect', authenticate, async (req, res) => {
    try {
      await notificationService.reconnect();
      res.json({ success: true, message: 'Reconnexion initiée' });
    } catch (error) {
      console.error('Reconnect Error:', error);
      res.status(500).json({ error: 'Failed to reconnect' });
    }
  });

  // WhatsApp Management Routes
  app.get('/api/whatsapp/status', authenticate, async (req, res) => {
    try {
      const status = notificationService.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get WhatsApp status' });
    }
  });

  app.post('/api/whatsapp/relink', authenticate, checkAdmin, async (req, res) => {
    try {
      const status = await notificationService.relinkWhatsAppSession();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to relink WhatsApp session' });
    }
  });

  app.post('/api/whatsapp/logout', authenticate, checkAdmin, async (req, res) => {
    try {
      const status = await notificationService.logoutWhatsApp();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to logout WhatsApp' });
    }
  });

  app.post('/api/whatsapp/ensure-qr', authenticate, async (req, res) => {
    try {
      const status = await notificationService.ensureWhatsAppQr();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to ensure QR code' });
    }
  });

  app.post('/api/whatsapp/send', authenticate, async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'phoneNumber and message are required' });
      }
      const result = await notificationService.sendWhatsAppMessage(phoneNumber, message);
      res.json(result);
    } catch (error) {
      console.error('WhatsApp send error:', error);
      res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
  });

  // Notification Alert Routes
  app.post('/api/notifications/send-maintenance-alert', authenticate, async (req, res) => {
    try {
      const { truckId, recipient } = req.body;
      const truck = await prisma.truck.findUnique({ where: { id: truckId } });
      if (!truck) return res.status(404).json({ error: 'Truck not found' });
      const result = await notificationService.sendMaintenanceAlert(truck, recipient);
      res.json(result);
    } catch (error) {
      console.error('Notification Error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  app.post('/api/notifications/send-low-stock-alert', authenticate, async (req, res) => {
    try {
      const { stockId, recipient } = req.body;
      const stock = await prisma.stock.findUnique({ where: { id: stockId } });
      if (!stock) return res.status(404).json({ error: 'Stock not found' });
      const result = await notificationService.sendLowStockAlert(stock, recipient);
      res.json(result);
    } catch (error) {
      console.error('Notification Error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  app.post('/api/notifications/send-sales-alert', authenticate, async (req, res) => {
    try {
      const { saleId, recipient } = req.body;
      const sale = await prisma.sale.findUnique({ where: { id: saleId } });
      if (!sale) return res.status(404).json({ error: 'Sale not found' });
      const result = await notificationService.sendNewSaleNotification(sale, recipient);
      res.json(result);
    } catch (error) {
      console.error('Notification Error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  app.post('/api/notifications/send-employee-alert', authenticate, async (req, res) => {
    try {
      const { employeeId, type, recipient } = req.body;
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      const result = await notificationService.sendEmployeeAlert(employee, type, recipient);
      res.json(result);
    } catch (error) {
      console.error('Notification Error:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // Relance WhatsApp automatique pour clients en retard
  app.post('/api/clients/relance-whatsapp', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const { clientId, seuilJours = 30 } = req.body;

      const whereClause = clientId ? { id: clientId } : { actif: true };
      const clients = await prisma.client.findMany({
        where: whereClause,
        include: { operations: { orderBy: { dateOperation: 'asc' } } }
      });

      const now = new Date();
      let relancesEnvoyees = 0;

      for (const client of clients) {
        // Solde réel : ventes/dépenses moins paiements/avances
        let solde = 0;
        const debtOps = [];
        for (const op of client.operations) {
          if (op.typeOperation === 'vente' || op.typeOperation === 'depense') {
            solde += op.montant;
            debtOps.push(op);
          } else if (op.typeOperation === 'paiement' || op.typeOperation === 'avance') {
            solde -= op.montant;
          }
        }

        // Vérifier si le client a un solde positif et est en retard
        if (solde > 0 && client.telephone && client.telephone.match(/^\d{10,}$/)) {
          // Âge de la créance = opération de débit la plus ancienne
          const oldestUnpaid = debtOps.length > 0 ? debtOps[0] : null;
          if (oldestUnpaid) {
            const daysDiff = Math.floor((now - new Date(oldestUnpaid.dateOperation)) / (1000 * 60 * 60 * 24));

            if (daysDiff >= seuilJours) {
              const message = `📢 RAPPEL DE PAIEMENT\n\nBonjour ${client.nom},\n\nVous avez une créance de ${solde.toLocaleString()} FCFA en attente depuis ${daysDiff} jours.\n\nNous vous prions de bien vouloir régler cette situation dans les meilleurs délais.\n\nMerci pour votre confiance.\nKOKANSEY SARLU`;

              await notificationService.sendWhatsAppMessage(client.telephone, message);
              relancesEnvoyees++;
            }
          }
        }
      }

      res.json({
        success: true,
        relancesEnvoyees,
        message: `${relancesEnvoyees} relance(s) envoyée(s) avec succès`
      });
    } catch (error) {
      console.error('Erreur relance WhatsApp:', error);
      res.status(500).json({ error: 'Failed to send WhatsApp reminders' });
    }
  });
}
