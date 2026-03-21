import express from 'express';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';
import Client from '../models/Client.js';

const router = express.Router();

let quotes = [];
let quoteCounter = 1000;

function nextQuoteNumber() {
  return `QT-${++quoteCounter}`;
}

async function resolveClientName(clientId, clientName) {
  if (clientName) return clientName;
  if (!clientId) return '';
  try {
    const c = await Client.findById(clientId).select('name email phone').lean();
    return c?.name || '';
  } catch { return ''; }
}

async function resolveClient(clientId) {
  if (!clientId) return null;
  try {
    return await Client.findById(clientId).select('name email phone company').lean();
  } catch { return null; }
}

// GET /api/quotes
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client } = req.query;
    let result = [...quotes];
    if (status) result = result.filter(q => q.status === status);
    if (client) result = result.filter(q => q.clientId === client || q.clientName?.toLowerCase().includes(client.toLowerCase()));
    const total = result.length;
    const paginated = result.slice((page - 1) * limit, page * limit);
    res.json({ success: true, data: { quotes: paginated, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/quotes
router.post('/', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'), logActivity('Quote created', 'quote', 'medium'), async (req, res) => {
  try {
    const { client, clientName, project, subject, items = [], validUntil, notes, tax = 0, discount = 0, budget = 0, paidAmount = 0 } = req.body;
    const resolvedClientName = await resolveClientName(client, clientName);
    const subtotal = items.reduce((sum, item) => sum + ((item.qty || item.quantity || 1) * (item.rate || 0)), 0);
    const total = subtotal + (subtotal * tax / 100) - discount;
    const remainingAmount = Math.max(0, Number(budget) - Number(paidAmount));

    const quoteNumber = nextQuoteNumber();
    const quote = {
      _id: String(quoteCounter),
      quoteNumber,
      clientId: client,
      clientName: resolvedClientName,
      project, subject, items, validUntil, notes,
      tax: Number(tax), discount: Number(discount),
      subtotal, total,
      budget: Number(budget) || 0,
      paidAmount: Number(paidAmount) || 0,
      remainingAmount,
      status: 'draft',
      createdBy: req.user._id.toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    quotes.push(quote);
    res.status(201).json({ success: true, message: 'Quote created', data: { quote } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/quotes/:id
router.get('/:id', authenticate, async (req, res) => {
  const quote = quotes.find(q => q._id === req.params.id);
  if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
  res.json({ success: true, data: { quote } });
});

// PUT /api/quotes/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'), logActivity('Quote updated', 'quote', 'medium'), async (req, res) => {
  const idx = quotes.findIndex(q => q._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Quote not found' });
  if (req.body.client) {
    req.body.clientName = await resolveClientName(req.body.client, req.body.clientName);
    req.body.clientId = req.body.client;
  }
  quotes[idx] = { ...quotes[idx], ...req.body, _id: quotes[idx]._id, updatedAt: new Date().toISOString() };
  res.json({ success: true, message: 'Quote updated', data: { quote: quotes[idx] } });
});

// DELETE /api/quotes/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'sales'), logActivity('Quote deleted', 'quote', 'high'), async (req, res) => {
  const idx = quotes.findIndex(q => q._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Quote not found' });
  quotes.splice(idx, 1);
  res.json({ success: true, message: 'Quote deleted' });
});

// POST /api/quotes/:id/send
router.post('/:id/send', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'), async (req, res) => {
  const quote = quotes.find(q => q._id === req.params.id);
  if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
  quote.status = 'sent';
  quote.sentAt = new Date().toISOString();
  res.json({ success: true, message: 'Quote sent', data: { quote } });
});

// POST /api/quotes/:id/convert
router.post('/:id/convert', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'), async (req, res) => {
  const quote = quotes.find(q => q._id === req.params.id);
  if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });
  quote.status = 'converted';
  quote.convertedAt = new Date().toISOString();
  res.json({ success: true, message: 'Quote converted to invoice', data: { quote, invoiceData: { ...quote, status: 'draft' } } });
});

// POST /api/quotes/:id/send-email
router.post('/:id/send-email', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'), async (req, res) => {
  try {
    const quote = quotes.find(q => q._id === req.params.id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });

    // Try to get client email from DB if we have clientId
    let clientEmail = null;
    if (quote.clientId) {
      const client = await resolveClient(quote.clientId);
      clientEmail = client?.email;
    }
    if (!clientEmail) return res.status(400).json({ success: false, message: 'Client has no email address' });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const itemsHtml = (quote.items || []).map(item =>
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${item.description || ''}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty || item.quantity || 1}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${Number(item.rate || 0).toLocaleString()}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${((item.qty || item.quantity || 1) * (item.rate || 0)).toLocaleString()}</td></tr>`
    ).join('');

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Parnets CRM'}" <${process.env.SMTP_USER}>`,
      to: clientEmail,
      subject: `Quote ${quote.quoteNumber}${quote.subject ? ' — ' + quote.subject : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
          <div style="background:linear-gradient(135deg,#2563eb,#f97316);padding:24px;border-radius:12px 12px 0 0">
            <h2 style="color:#fff;margin:0">Quote ${quote.quoteNumber}</h2>
            ${quote.subject ? `<p style="color:rgba(255,255,255,0.85);margin:4px 0 0">${quote.subject}</p>` : ''}
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p>Dear ${quote.clientName || 'Client'},</p>
            <p>Please find below the quote details.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead><tr style="background:#f8fafc">
                <th style="padding:8px 12px;text-align:left">Description</th>
                <th style="padding:8px 12px;text-align:center">Qty</th>
                <th style="padding:8px 12px;text-align:right">Rate</th>
                <th style="padding:8px 12px;text-align:right">Amount</th>
              </tr></thead>
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr><td colspan="3" style="padding:6px 12px;text-align:right">Subtotal</td><td style="padding:6px 12px;text-align:right">₹${Number(quote.subtotal || 0).toLocaleString()}</td></tr>
                ${quote.tax ? `<tr><td colspan="3" style="padding:6px 12px;text-align:right">GST</td><td style="padding:6px 12px;text-align:right">₹${Number(quote.tax || 0).toLocaleString()}</td></tr>` : ''}
                <tr style="background:#f8fafc;font-weight:bold"><td colspan="3" style="padding:8px 12px;text-align:right">Total</td><td style="padding:8px 12px;text-align:right">₹${Number(quote.total || 0).toLocaleString()}</td></tr>
              </tfoot>
            </table>
            ${quote.validUntil ? `<p style="color:#64748b;font-size:14px">Valid until: ${new Date(quote.validUntil).toLocaleDateString('en-IN')}</p>` : ''}
            ${quote.notes ? `<p style="color:#64748b;font-size:14px"><strong>Notes:</strong> ${quote.notes}</p>` : ''}
            <p style="margin-top:24px">Regards,<br><strong>Parnets Networks Pvt. Ltd.</strong></p>
          </div>
        </div>`,
    });

    quote.status = 'sent';
    quote.sentAt = new Date().toISOString();
    quote.sentVia = 'email';
    res.json({ success: true, message: `Quote sent to ${clientEmail}` });
  } catch (e) {
    console.error('Send quote email error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to send email' });
  }
});

// POST /api/quotes/:id/send-whatsapp
router.post('/:id/send-whatsapp', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'), async (req, res) => {
  try {
    const quote = quotes.find(q => q._id === req.params.id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });

    let clientPhone = null;
    if (quote.clientId) {
      const client = await resolveClient(quote.clientId);
      clientPhone = client?.phone;
    }
    if (!clientPhone) return res.status(400).json({ success: false, message: 'Client has no phone number' });

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || TWILIO_ACCOUNT_SID === 'your-twilio-account-sid') {
      return res.status(503).json({ success: false, message: 'WhatsApp (Twilio) not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN to .env' });
    }

    const itemLines = (quote.items || []).map(i => `• ${i.description}: ₹${((i.qty || 1) * (i.rate || 0)).toLocaleString()}`).join('\n');
    const message = `*Quote ${quote.quoteNumber}*${quote.subject ? '\n' + quote.subject : ''}\n\n${itemLines}\n\n*Total: ₹${Number(quote.total || 0).toLocaleString()}*\n${quote.validUntil ? `Valid until: ${new Date(quote.validUntil).toLocaleDateString('en-IN')}` : ''}\n\nRegards,\nParnets Networks Pvt. Ltd.`;

    const toNumber = `whatsapp:+91${clientPhone.replace(/\D/g, '').slice(-10)}`;
    const fromNumber = TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const authHeader = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: fromNumber, To: toNumber, Body: message }),
      }
    );
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) return res.status(400).json({ success: false, message: twilioData.message || 'WhatsApp send failed' });

    quote.status = 'sent';
    quote.sentAt = new Date().toISOString();
    quote.sentVia = 'whatsapp';
    res.json({ success: true, message: `Quote sent via WhatsApp to ${clientPhone}` });
  } catch (e) {
    console.error('WhatsApp quote error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to send WhatsApp' });
  }
});

// GET /api/quotes/:id/pdf
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const quote = quotes.find(q => q._id === req.params.id);
    if (!quote) return res.status(404).json({ success: false, message: 'Quote not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quote-${quote.quoteNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('QUOTE', 50, 25);
    doc.fontSize(11).font('Helvetica').text(quote.quoteNumber, 50, 52);
    doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString('en-IN')}`, 350, 25, { align: 'right', width: 200 });
    if (quote.validUntil) doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString('en-IN')}`, 350, 42, { align: 'right', width: 200 });

    doc.fillColor('#1e293b').moveDown(3);

    // From / To
    doc.fontSize(10).font('Helvetica-Bold').text('FROM', 50, 100);
    doc.font('Helvetica').text('Parnets Networks Pvt. Ltd.', 50, 115);
    doc.font('Helvetica-Bold').text('TO', 300, 100);
    doc.font('Helvetica').text(quote.clientName || '—', 300, 115);

    // Subject
    if (quote.subject) {
      doc.font('Helvetica-Bold').fontSize(11).text('Subject:', 50, 145);
      doc.font('Helvetica').text(quote.subject, 120, 145);
    }

    doc.moveTo(50, 170).lineTo(545, 170).strokeColor('#e2e8f0').stroke();

    // Items table
    let y = 185;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e293b').text('Line Items', 50, y);
    y += 20;

    doc.rect(50, y, 495, 22).fill('#f8fafc');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, y + 6)
      .text('QTY', 340, y + 6, { width: 50, align: 'center' })
      .text('RATE', 400, y + 6, { width: 70, align: 'right' })
      .text('AMOUNT', 480, y + 6, { align: 'right', width: 55 });
    y += 22;

    (quote.items || []).forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, y, 495, 20).fill('#fafafa');
      const qty = item.qty || item.quantity || 1;
      const amount = qty * (item.rate || 0);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(item.description || '', 60, y + 4, { width: 270 })
        .text(String(qty), 340, y + 4, { width: 50, align: 'center' })
        .text(`₹${Number(item.rate || 0).toLocaleString('en-IN')}`, 400, y + 4, { width: 70, align: 'right' })
        .text(`₹${Number(amount).toLocaleString('en-IN')}`, 480, y + 4, { align: 'right', width: 55 });
      doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor('#f1f5f9').stroke();
      y += 20;
    });

    // Totals
    y += 10;
    const rowTotal = (label, value, bold = false) => {
      if (bold) doc.rect(50, y, 495, 26).fill('#2563eb');
      doc.fillColor(bold ? '#ffffff' : '#1e293b').fontSize(bold ? 12 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 60, y + (bold ? 7 : 4))
        .text(`₹${Number(value).toLocaleString('en-IN')}`, 480, y + (bold ? 7 : 4), { align: 'right', width: 55 });
      y += bold ? 36 : 20;
    };

    rowTotal('Subtotal', quote.subtotal || 0);
    if (quote.tax) rowTotal(`GST`, quote.tax || 0);
    if (quote.discount) rowTotal(`Discount`, -(quote.discount || 0));
    rowTotal('TOTAL', quote.total || 0, true);

    if (quote.notes) {
      y += 10;
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('Notes:', 50, y);
      doc.font('Helvetica').text(quote.notes, 50, y + 15, { width: 495 });
    }

    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#e2e8f0').stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Parnets Networks Pvt. Ltd. | This quote is computer generated.', 50, footerY, { align: 'center', width: 495 });

    doc.end();
  } catch (e) {
    console.error('PDF quote error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
});

export default router;
