import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../../temp');

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEFAULT_TEMPLATE = {
  companyName: 'KOKANSEY SARLU',
  companySubtitle: 'Gestion Agricole & Commerciale',
  companyAddress: 'Abidjan, Côte d\'Ivoire',
  companyPhone: '+225 XX XX XX XX',
  companyEmail: 'contact@kokansey.ci',
  logoUrl: '',
  primaryColor: '#1a4d2e',
  secondaryColor: '#2d6a4f',
  footerText: 'Merci pour votre confiance.',
  legalMention: 'TVA non applicable - Article 293 B du CGI',
  disclaimer: '',
  defaultNotes: '',
  showSignatureZones: true,
  showQrCode: false,
  taxLabel: 'TVA',
  taxRate: 0
};

export async function getInvoiceTemplate(prisma) {
  let template = await prisma.invoiceTemplate.findFirst();
  if (!template) {
    template = await prisma.invoiceTemplate.create({
      data: { ...DEFAULT_TEMPLATE, updatedBy: null }
    });
  }
  return template;
}

async function getLogoDataUrl(logoUrl) {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('data:')) return logoUrl;

  // Try to read a local file path (absolute or relative to backend root)
  let filePath = logoUrl;
  if (filePath.startsWith('/')) {
    filePath = path.join(__dirname, '../..', filePath);
  }
  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn('[PDF] Impossible de charger le logo:', filePath, err.message);
    return '';
  }
}

function invoiceToHTML(invoice, template, logoDataUrl = '') {
  const t = { ...DEFAULT_TEMPLATE, ...template };
  const primaryColor = escapeHtml(t.primaryColor || DEFAULT_TEMPLATE.primaryColor);
  const secondaryColor = escapeHtml(t.secondaryColor || DEFAULT_TEMPLATE.secondaryColor);

  const totalTTC = invoice.montantTotal;
  const taxRate = parseFloat(t.taxRate) || 0;
  const totalHT = taxRate > 0 ? totalTTC / (1 + taxRate) : totalTTC;
  const taxAmount = totalTTC - totalHT;
  const reste = totalTTC - invoice.montantPaye;

  const taxLabel = escapeHtml(t.taxLabel) || 'TVA';
  const footerRight = `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`;

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="logo" style="max-height: 70px; max-width: 180px; margin-bottom: 10px;">`
    : '';

  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(item.description)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity.toLocaleString('fr-FR')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${escapeHtml(item.unit)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.unitPrice.toLocaleString('fr-FR')} FCFA</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.totalPrice.toLocaleString('fr-FR')} FCFA</td>
    </tr>
  `).join('');

  const clientNom = escapeHtml(invoice.client?.nom || 'N/A');
  const clientTelephone = escapeHtml(invoice.client?.telephone || '');
  const clientEmail = escapeHtml(invoice.client?.email || '');
  const clientAdresse = escapeHtml(invoice.client?.adresse || '');
  const numero = escapeHtml(invoice.numero);
  const statut = escapeHtml(invoice.statut);
  const dateEmission = new Date(invoice.dateEmission).toLocaleDateString('fr-FR');
  const dateEcheance = invoice.dateEcheance ? new Date(invoice.dateEcheance).toLocaleDateString('fr-FR') : 'Non définie';

  const notes = escapeHtml(invoice.notes || t.defaultNotes || '');
  const legal = escapeHtml(invoice.mentionsLegales || t.legalMention || '');
  const disclaimer = escapeHtml(t.disclaimer || '');

  const signatureZones = t.showSignatureZones ? `
    <div class="signature-zone">
      <div>Signature du client</div>
      <div>Signature / Cachet ${escapeHtml(t.companyName)}</div>
    </div>
  ` : '';

  const notesSection = notes ? `<div class="notes-section"><strong>Notes :</strong> ${notes}</div>` : '';
  const legalSection = legal ? `<div class="notes-section"><strong>Mentions légales :</strong> ${legal}</div>` : '';
  const disclaimerSection = disclaimer ? `<div class="notes-section"><strong>Disclaimer :</strong> ${disclaimer}</div>` : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">
  <title>Facture ${numero}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 30px;
      color: #333;
      background: #fff;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .top-banner {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: white;
      padding: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .company-info h1 {
      margin: 0 0 5px 0;
      font-size: 28px;
      letter-spacing: 1px;
    }
    .company-info p {
      margin: 2px 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .invoice-badge {
      text-align: right;
    }
    .invoice-badge .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 2px;
      opacity: 0.8;
    }
    .invoice-badge .number {
      font-size: 22px;
      font-weight: bold;
      margin-top: 5px;
    }
    .status-box {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
      background: #dbeafe;
      color: #1e40af;
    }
    .invoice-body {
      padding: 30px;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-bottom: 30px;
    }
    .info-box {
      flex: 1;
    }
    .info-box h3 {
      margin: 0 0 8px 0;
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 1px;
    }
    .info-box p {
      margin: 3px 0;
      font-size: 14px;
    }
    .info-box .big {
      font-size: 16px;
      font-weight: 600;
      color: ${primaryColor};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      font-size: 14px;
    }
    thead {
      background: #f3f4f6;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid ${primaryColor};
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    .totals table {
      width: 320px;
      border-collapse: collapse;
    }
    .totals td {
      padding: 10px 12px;
      border: none;
    }
    .totals td.label {
      text-align: left;
      color: #6b7280;
    }
    .totals td.value {
      text-align: right;
      font-weight: 600;
    }
    .totals tr.grand-total td {
      font-size: 18px;
      font-weight: bold;
      color: ${primaryColor};
      border-top: 2px solid ${primaryColor};
    }
    .notes-section {
      margin-top: 25px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 6px;
      font-size: 13px;
    }
    .signature-zone {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature-zone div {
      width: 45%;
      border-top: 1px solid #9ca3af;
      padding-top: 8px;
      font-size: 12px;
      color: #6b7280;
    }
    .footer {
      margin-top: 40px;
      padding: 20px 30px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="top-banner">
      <div class="company-info">
        ${logoHtml}
        <h1>${escapeHtml(t.companyName)}</h1>
        <p>${escapeHtml(t.companySubtitle)}</p>
        <p>${escapeHtml(t.companyAddress)}</p>
        <p>Tél : ${escapeHtml(t.companyPhone)}</p>
        <p>Email : ${escapeHtml(t.companyEmail)}</p>
      </div>
      <div class="invoice-badge">
        <div class="label">Facture</div>
        <div class="number">${numero}</div>
        <div class="status-box">${statut}</div>
      </div>
    </div>

    <div class="invoice-body">
      <div class="info-grid">
        <div class="info-box">
          <h3>Facturé à</h3>
          <p class="big">${clientNom}</p>
          <p>${clientTelephone}</p>
          <p>${clientEmail}</p>
          <p>${clientAdresse}</p>
        </div>
        <div class="info-box">
          <h3>Informations facture</h3>
          <p><strong>Date d'émission :</strong> ${dateEmission}</p>
          <p><strong>Date d'échéance :</strong> ${dateEcheance}</p>
          <p><strong>Référence :</strong> ${numero}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%">Description</th>
            <th style="text-align: center">Qté</th>
            <th style="text-align: center">Unité</th>
            <th style="text-align: right">Prix unit.</th>
            <th style="text-align: right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td class="label">Total HT</td>
            <td class="value">${totalHT.toLocaleString('fr-FR')} FCFA</td>
          </tr>
          <tr>
            <td class="label">${taxLabel}</td>
            <td class="value">${taxAmount.toLocaleString('fr-FR')} FCFA</td>
          </tr>
          <tr>
            <td class="label">Total TTC</td>
            <td class="value">${totalTTC.toLocaleString('fr-FR')} FCFA</td>
          </tr>
          <tr>
            <td class="label">Montant payé</td>
            <td class="value">${invoice.montantPaye.toLocaleString('fr-FR')} FCFA</td>
          </tr>
          <tr class="grand-total">
            <td class="label">RESTE À PAYER</td>
            <td class="value">${reste.toLocaleString('fr-FR')} FCFA</td>
          </tr>
        </table>
      </div>

      ${notesSection}
      ${legalSection}
      ${disclaimerSection}

      ${signatureZones}
    </div>

    <div class="footer">
      <span>${escapeHtml(t.footerText)}</span>
      <span>${footerRight}</span>
    </div>
  </div>
</body>
</html>
  `;
}

export async function generateInvoicePDF(invoice, prisma) {
  await ensureTempDir();

  const template = await getInvoiceTemplate(prisma);
  const logoDataUrl = await getLogoDataUrl(template.logoUrl);

  const filename = `facture-${invoice.numero}.pdf`;
  const filePath = path.join(TEMP_DIR, filename);
  const htmlContent = invoiceToHTML(invoice, template, logoDataUrl);

  const htmlPath = path.join(TEMP_DIR, `facture-${invoice.numero}.html`);
  await fs.writeFile(htmlPath, htmlContent, 'utf8');

  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch (err) {
    console.warn('[PDF] puppeteer non disponible, tentative avec puppeteer-core:', err.message);
    puppeteer = await import('puppeteer-core');
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });
  } finally {
    await browser.close();
  }

  try {
    await fs.unlink(htmlPath);
  } catch (err) {
    // ignore
  }

  return filePath;
}

export async function cleanupTempFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // ignore
  }
}
