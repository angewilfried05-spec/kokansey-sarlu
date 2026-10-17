import { validate, saleSchema } from '../validators.js';
import { generateInvoicePDF, cleanupTempFile } from '../services/pdf.js';

export default function registerSalesRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, notificationService }) {

  // Générer un numéro de facture
  async function generateInvoiceNumber(tx) {
    const currentYear = new Date().getFullYear();
    const prefix = `FACT-${currentYear}-`;

    const lastInvoices = await tx.invoice.findMany({
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
  // Get all sales
  app.get('/api/sales', authenticate, async (req, res) => {
    try {
      const sales = await prisma.sale.findMany({
        include: { speculation: true },
        orderBy: { date: 'desc' }
      });
      res.json(sales);
    } catch (error) {
      console.error('Erreur récupération ventes:', error);
      res.status(500).json({ error: 'Failed to fetch sales' });
    }
  });

  // Create sale
  app.post('/api/sales', authenticate, authorize(['GERANT', 'COMMERCIAL']), validate(saleSchema), async (req, res) => {
    const { speculationId, quantity, unitPrice, date, product, unit, client, clientId, observation, campagneId } = req.body;
    const qty = parseFloat(quantity);
    const uprice = parseFloat(unitPrice);
    const totalPrice = qty * uprice;

    console.log('[SALE] Données reçues:', { speculationId, quantity, unitPrice, date, product, unit, client, clientId, observation, campagneId });

    try {
      const result = await prisma.$transaction(async (tx) => {
        let clientNom = client || null;
        let clientRecord = null;
        let quality = null;

        // Récupérer la qualité de la récolte la plus récente pour cette spéculation
        const recentHarvest = await tx.harvest.findFirst({
          where: { speculationId },
          orderBy: { date: 'desc' },
          take: 1
        });
        if (recentHarvest) {
          quality = recentHarvest.quality;
        }

        if (clientId) {
          clientRecord = await tx.client.findUnique({ where: { id: clientId } });
          if (!clientRecord) throw new Error('Client introuvable');
          clientNom = clientRecord.nom;
        }

        console.log('[SALE] Création de la vente...');
        const sale = await tx.sale.create({
          data: {
            speculationId,
            product,
            quantity: qty,
            unit,
            unitPrice: uprice,
            totalPrice,
            date: new Date(date),
            client: clientNom,
            clientId: clientId || null,
            observation: (observation || '') + (quality ? ` [Qualité: ${quality}]` : ''),
            campagneId: campagneId || null
          }
        });
        console.log('[SALE] Vente créée avec ID:', sale.id);

        // Génération automatique de la facture
        let invoice = null;
        let saleToReturn = sale;
        if (clientId) {
          const numero = await generateInvoiceNumber(tx);
          invoice = await tx.invoice.create({
            data: {
              numero,
              clientId,
              montantTotal: totalPrice,
              montantPaye: 0,
              statut: 'EN_ATTENTE',
              notes: observation || null,
              mentionsLegales: 'TVA non applicable - Article 293 B du CGI'
            }
          });

          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              saleId: sale.id,
              description: `${product}${quality ? ` [Qualité: ${quality}]` : ''}`,
              quantity: qty,
              unit,
              unitPrice: uprice,
              totalPrice
            }
          });

          await tx.sale.update({
            where: { id: sale.id },
            data: { invoiceId: invoice.id }
          });

          saleToReturn = await tx.sale.findUnique({
            where: { id: sale.id },
            include: { speculation: true }
          });

          await tx.operationClient.create({
            data: {
              clientId,
              typeOperation: 'vente',
              montant: totalPrice,
              description: `Facture ${numero} - Vente: ${product} (${qty} ${unit})`,
              reference: numero,
              dateOperation: new Date(date),
              creePar: req.user.username,
              saleId: sale.id,
              invoiceId: invoice.id
            }
          });
          console.log('[SALE] Facture et opération compte client créées:', numero);
        } else {
          // Vente comptant sans client identifié : pas de facture
          console.log('[SALE] Vente comptant sans client, pas de facture générée');
        }

        console.log('[SALE] Recherche du stock pour speculationId:', speculationId);
        const stock = await tx.stock.findFirst({
          where: { speculationId, category: 'Produit Fini' }
        });
        console.log('[SALE] Stock trouvé:', stock ? `ID: ${stock.id}, Quantité: ${stock.quantity}` : 'Aucun');

        if (stock) {
          if (stock.quantity < qty) {
            console.log('[SALE] ATTENTION: Stock insuffisant ! Stock: ' + stock.quantity + ', Demandé: ' + qty);
          }

          if (stock.quantity >= qty) {
            console.log('[SALE] Création du mouvement de stock OUT...');
            await tx.stockMovement.create({
              data: {
                stockId: stock.id,
                type: 'OUT',
                quantity: qty,
                date: new Date(date),
                reason: `Vente automatique: ${sale.id}`,
                speculationId
              }
            });

            console.log('[SALE] Mise à jour de la quantité du stock...');
            await tx.stock.update({
              where: { id: stock.id },
              data: {
                quantity: { decrement: qty }
              }
            });
            console.log('[SALE] Stock mis à jour');
          } else {
            console.log('[SALE] Stock insuffisant, pas de mouvement de stock');
          }
        } else {
          console.log('[SALE] Aucun stock trouvé, pas de mouvement de stock');
        }

        return { sale: saleToReturn, invoice, clientRecord };
      });

      await logAction(req.user.id, 'CREATE', 'SALE', { product, total: result.sale.totalPrice, invoice: result.invoice?.numero });

      // Notification admin (non bloquant)
      const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
      if (adminNumber) {
        notificationService.sendWhatsAppMessage(adminNumber, `Nouvelle vente: ${product} - ${totalPrice.toLocaleString()} FCFA`)
          .catch(whatsappError => console.error('Erreur notification WhatsApp admin:', whatsappError));
      }

      // Envoyer la facture par WhatsApp au client (PDF, non bloquant)
      if (result.invoice && result.clientRecord?.telephone) {
        (async () => {
          try {
            const fullInvoice = await prisma.invoice.findUnique({
              where: { id: result.invoice.id },
              include: { items: true, client: true }
            });

            if (fullInvoice) {
              const pdfPath = await generateInvoicePDF(fullInvoice, prisma);
              const caption = `Bonjour ${result.clientRecord.nom},\nVotre facture ${fullInvoice.numero} - Total : ${fullInvoice.montantTotal.toLocaleString()} FCFA\nKOKANSEY SARLU`;

              const whatsappResult = await notificationService.sendWhatsAppMedia(result.clientRecord.telephone, pdfPath, caption);
              if (!whatsappResult.success) {
                console.warn('[SALE] Échec envoi PDF WhatsApp client:', whatsappResult.error);
              } else {
                console.log('[SALE] Facture PDF envoyée par WhatsApp au client:', result.clientRecord.telephone);
              }

              await cleanupTempFile(pdfPath);
            }
          } catch (whatsappError) {
            console.error('Erreur envoi PDF WhatsApp client:', whatsappError);
          }
        })();
      }

      res.json({ sale: result.sale, invoice: result.invoice });
    } catch (error) {
      console.error('[SALE] Erreur lors de la création de la vente:', error);
      res.status(500).json({ error: 'Failed to create sale and update stock', details: error.message });
    }
  });

  // Update sale
  app.put('/api/sales/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const sale = await prisma.sale.update({
        where: { id: req.params.id },
        data: req.body
      });
      await logAction(req.user.id, 'UPDATE', 'SALE', { id: sale.id, product: sale.product });
      res.json(sale);
    } catch (error) {
      console.error('Erreur modification vente:', error);
      res.status(500).json({ error: 'Failed to update sale' });
    }
  });

  // Delete sale
  app.delete('/api/sales/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const sale = await prisma.sale.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'SALE', { id: sale.id, product: sale.product });
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression vente:', error);
      res.status(500).json({ error: 'Failed to delete sale' });
    }
  });
}
