import { validate, invoiceTemplateSchema } from '../validators.js';
import { generateInvoicePDF, getInvoiceTemplate, cleanupTempFile } from '../services/pdf.js';

export default function registerInvoicesRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, notificationService }) {
  // Get all invoices
  app.get('/api/invoices', authenticate, async (req, res) => {
    try {
      const invoices = await prisma.invoice.findMany({
        include: {
          client: true,
          items: { include: { sale: true } },
          sales: { include: { speculation: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(invoices);
    } catch (error) {
      console.error('Erreur récupération factures:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  // Get invoice by ID
  app.get('/api/invoices/:id', authenticate, async (req, res) => {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: {
          client: true,
          items: { include: { sale: true } },
          sales: { include: { speculation: true } },
          operations: true
        }
      });
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      console.error('Erreur récupération facture:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });

  // Generate invoice number
  async function generateInvoiceNumber() {
    const currentYear = new Date().getFullYear();
    const prefix = `FACT-${currentYear}-`;

    // Get the last invoice for this year
    const lastInvoices = await prisma.invoice.findMany({
      where: { numero: { startsWith: prefix } },
      orderBy: { numero: 'desc' },
      take: 1
    });

    let sequence = 1;
    if (lastInvoices.length > 0) {
      const lastNumber = lastInvoices[0].numero;
      const match = lastNumber.match(/-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  // Create invoice
  app.post('/api/invoices', authenticate, authorize(['GERANT', 'COMMERCIAL']), async (req, res) => {
    try {
      const { clientId, dateEcheance, items, notes, mentionsLegales } = req.body;

      if (!clientId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Client et articles requis' });
      }

      // Validate items and calculate total
      let montantTotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const { description, quantity, unit, unitPrice, saleId } = item;
        const qty = parseFloat(quantity);
        const price = parseFloat(unitPrice);
        const total = qty * price;

        if (isNaN(qty) || isNaN(price) || qty <= 0 || price < 0) {
          return res.status(400).json({ error: 'Quantité et prix unitaire invalides' });
        }

        montantTotal += total;
        validatedItems.push({
          description,
          quantity: qty,
          unit,
          unitPrice: price,
          totalPrice: total,
          saleId: saleId || null
        });
      }

      const numero = await generateInvoiceNumber();

      const invoice = await prisma.$transaction(async (tx) => {
        // Create invoice
        const newInvoice = await tx.invoice.create({
          data: {
            numero,
            clientId,
            dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
            montantTotal,
            montantPaye: 0,
            statut: 'EN_ATTENTE',
            notes,
            mentionsLegales
          }
        });

        // Create invoice items
        for (const item of validatedItems) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              ...item
            }
          });

          // Link sale to invoice if saleId provided
          if (item.saleId) {
            await tx.sale.update({
              where: { id: item.saleId },
              data: { invoiceId: newInvoice.id }
            });
          }
        }

        // Create client operation
        await tx.operationClient.create({
          data: {
            clientId,
            typeOperation: 'vente',
            montant: montantTotal,
            description: `Facture ${numero}`,
            reference: numero,
            invoiceId: newInvoice.id,
            creePar: req.user.username
          }
        });

        return newInvoice;
      });

      await logAction(req.user.id, 'CREATE', 'INVOICE', { numero, montant: montantTotal });

      const fullInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          client: true,
          items: true,
          sales: true
        }
      });

      res.json(fullInvoice);
    } catch (error) {
      console.error('Erreur création facture:', error);
      res.status(500).json({ error: 'Failed to create invoice', details: error.message });
    }
  });

  // Update invoice
  app.put('/api/invoices/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const { dateEcheance, notes, mentionsLegales, statut, items } = req.body;

      const invoice = await prisma.$transaction(async (tx) => {
        // Update invoice fields
        const updateData = {};
        if (dateEcheance !== undefined) updateData.dateEcheance = dateEcheance ? new Date(dateEcheance) : null;
        if (notes !== undefined) updateData.notes = notes;
        if (mentionsLegales !== undefined) updateData.mentionsLegales = mentionsLegales;
        if (statut !== undefined) updateData.statut = statut;

        const updated = await tx.invoice.update({
          where: { id: req.params.id },
          data: updateData
        });

        // Update items if provided
        if (items && Array.isArray(items) && items.length > 0) {
          // Delete existing items
          await tx.invoiceItem.deleteMany({
            where: { invoiceId: req.params.id }
          });

          let montantTotal = 0;
          for (const item of items) {
            const qty = parseFloat(item.quantity);
            const price = parseFloat(item.unitPrice);
            const total = qty * price;
            montantTotal += total;

            await tx.invoiceItem.create({
              data: {
                invoiceId: req.params.id,
                description: item.description,
                quantity: qty,
                unit: item.unit,
                unitPrice: price,
                totalPrice: total,
                saleId: item.saleId || null
              }
            });

            if (item.saleId) {
              await tx.sale.update({
                where: { id: item.saleId },
                data: { invoiceId: req.params.id }
              });
            }
          }

          await tx.invoice.update({
            where: { id: req.params.id },
            data: { montantTotal }
          });
        }

        return updated;
      });

      await logAction(req.user.id, 'UPDATE', 'INVOICE', { id: invoice.id, numero: invoice.numero });
      res.json(invoice);
    } catch (error) {
      console.error('Erreur modification facture:', error);
      res.status(500).json({ error: 'Failed to update invoice' });
    }
  });

  // Update invoice payment
  app.post('/api/invoices/:id/payment', authenticate, authorize(['GERANT', 'COMMERCIAL']), async (req, res) => {
    try {
      const { montant, modePaiement } = req.body;
      const paymentAmount = parseFloat(montant);

      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ error: 'Montant invalide' });
      }

      const invoice = await prisma.$transaction(async (tx) => {
        const existing = await tx.invoice.findUnique({
          where: { id: req.params.id }
        });

        if (!existing) throw new Error('Facture introuvable');

        const newMontantPaye = existing.montantPaye + paymentAmount;
        let newStatut = 'PARTIELLEMENT_PAYEE';
        if (newMontantPaye >= existing.montantTotal) newStatut = 'PAYEE';

        const updated = await tx.invoice.update({
          where: { id: req.params.id },
          data: {
            montantPaye: newMontantPaye,
            statut: newStatut
          }
        });

        // Create payment operation
        await tx.operationClient.create({
          data: {
            clientId: existing.clientId,
            typeOperation: 'paiement',
            montant: paymentAmount,
            description: `Paiement facture ${existing.numero}`,
            reference: existing.numero,
            modePaiement,
            invoiceId: existing.id,
            creePar: req.user.username
          }
        });

        return updated;
      });

      await logAction(req.user.id, 'PAYMENT', 'INVOICE', { id: invoice.id, montant: paymentAmount });
      res.json(invoice);
    } catch (error) {
      console.error('Erreur paiement facture:', error);
      res.status(500).json({ error: 'Failed to record payment' });
    }
  });

  // Send invoice PDF via WhatsApp
  app.post('/api/invoices/:id/send-pdf', authenticate, authorize(['GERANT', 'COMMERCIAL']), async (req, res) => {
    try {
      const { telephone, message } = req.body;
      const invoice = await prisma.invoice.findUnique({
        where: { id: req.params.id },
        include: { items: true, client: true }
      });

      if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });

      const recipient = telephone?.trim() || invoice.client?.telephone;
      if (!recipient) return res.status(400).json({ error: 'Numéro de téléphone manquant' });

      const pdfPath = await generateInvoicePDF(invoice, prisma);
      const caption = message?.trim() || `Bonjour ${invoice.client?.nom || 'Madame, Monsieur'},\nVoici votre facture ${invoice.numero} - Total : ${invoice.montantTotal.toLocaleString('fr-FR')} FCFA\nKOKANSEY SARLU`;

      const result = await notificationService.sendWhatsAppMedia(recipient, pdfPath, caption);
      await cleanupTempFile(pdfPath);

      await logAction(req.user.id, 'SEND_PDF', 'INVOICE', { id: invoice.id, numero: invoice.numero, phone: recipient, success: result.success });

      if (result.success) {
        res.json({ success: true, message: 'Facture PDF envoyée par WhatsApp' });
      } else {
        res.status(500).json({ error: 'Échec envoi WhatsApp', details: result.error });
      }
    } catch (error) {
      console.error('Erreur envoi PDF facture:', error);
      res.status(500).json({ error: 'Failed to send PDF invoice', details: error.message });
    }
  });

  // Delete invoice
  app.delete('/api/invoices/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const invoice = await prisma.$transaction(async (tx) => {
        // Unlink sales
        await tx.sale.updateMany({
          where: { invoiceId: req.params.id },
          data: { invoiceId: null }
        });

        // Delete related operations
        await tx.operationClient.deleteMany({
          where: { invoiceId: req.params.id }
        });

        // Delete invoice items
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: req.params.id }
        });

        // Delete invoice
        return await tx.invoice.delete({
          where: { id: req.params.id }
        });
      });

      await logAction(req.user.id, 'DELETE', 'INVOICE', { id: invoice.id, numero: invoice.numero });
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression facture:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  });

  // Get invoice template
  app.get('/api/invoice-template', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const template = await getInvoiceTemplate(prisma);
      res.json(template);
    } catch (error) {
      console.error('Erreur récupération modèle facture:', error);
      res.status(500).json({ error: 'Failed to fetch invoice template' });
    }
  });

  // Update invoice template
  app.put('/api/invoice-template', authenticate, authorize(['GERANT']), validate(invoiceTemplateSchema), async (req, res) => {
    try {
      const existing = await prisma.invoiceTemplate.findFirst();
      let template;
      if (existing) {
        template = await prisma.invoiceTemplate.update({
          where: { id: existing.id },
          data: { ...req.body, updatedBy: req.user.id }
        });
      } else {
        template = await prisma.invoiceTemplate.create({
          data: { ...req.body, updatedBy: req.user.id }
        });
      }
      await logAction(req.user.id, 'UPDATE', 'INVOICE_TEMPLATE', { id: template.id });
      res.json(template);
    } catch (error) {
      console.error('Erreur mise à jour modèle facture:', error);
      res.status(500).json({ error: 'Failed to update invoice template' });
    }
  });
}
