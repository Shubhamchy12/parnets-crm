import express from 'express';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import Transaction from '../models/Transaction.js';

const router = express.Router();

async function resolveClient(clientId) {
  if (!clientId) return null;
  try {
    return await Client.findById(clientId).select('name email phone company address').lean();
  } catch { return null; }
}

// GET /api/invoices/approved-quotations
router.get('/approved-quotations', authenticate, async (req, res) => {
  try {
    const quotations = await Quotation.find({ status: 'approved' })
      .populate({ path: 'project', select: 'name' })
      .populate({ path: 'client', select: 'name email phone company address' })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { quotations } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/invoices/by-quote/:quoteId — all invoices for a quotation
router.get('/by-quote/:quoteId', authenticate, async (req, res) => {
  try {
    const invoices = await Invoice.find({ fromQuote: req.params.quoteId })
      .sort({ installmentNumber: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, data: { invoices } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/invoices
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client, project } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (client) filter.client = client;
    if (project) filter.project = project;

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('client', 'name email phone')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .lean();

    res.json({ success: true, data: { invoices, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/invoices
router.post('/', authenticate, authorize('super_admin', 'admin', 'sales'),
  logActivity('Invoice created', 'invoice', 'medium'),
  async (req, res) => {
    try {
      const {
        client, clientName, clientAddress, clientPhone,
        project, projectName,
        items = [], dueDate, notes,
        tax = 0, discount = 0,
        budget = 0, paidAmount = 0,
        fromQuote, quotationNumber,
        installmentNumber, installmentLabel, description,
        totalPaidSoFar = 0,
      } = req.body;

      const subtotal = items.reduce((s, i) => s + ((i.qty || i.quantity || 1) * (i.rate || 0)), 0);
      const total = subtotal + Number(tax) - Number(discount);
      const totalBudget = Number(budget) || 0;
      const thisPaid = Number(paidAmount) || 0;
      const alreadyPaid = Number(totalPaidSoFar) || 0;
      const remainingAmount = Math.max(0, totalBudget - alreadyPaid - thisPaid);

      // Resolve clientName from DB if not provided
      let resolvedClientName = clientName;
      if (!resolvedClientName && client) {
        const c = await Client.findById(client).select('name').lean();
        resolvedClientName = c?.name || '';
      }

      const invoice = await Invoice.create({
        client: client || undefined,
        clientName: resolvedClientName || '',
        clientAddress: clientAddress || '',
        clientPhone: clientPhone || '',
        project: project || undefined,
        projectName: projectName || '',
        fromQuote: fromQuote || undefined,
        quotationNumber: quotationNumber || '',
        items,
        subtotal,
        tax: Number(tax),
        discount: Number(discount),
        total,
        budget: totalBudget,
        paidAmount: thisPaid,
        totalPaidSoFar: alreadyPaid + thisPaid,
        remainingAmount,
        installmentNumber: installmentNumber || undefined,
        installmentLabel: installmentLabel || '',
        description: description || '',
        dueDate: dueDate || undefined,
        notes: notes || '',
        status: 'draft',
        payments: [],
        createdBy: req.user._id,
      });

      res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
    } catch (e) {
      console.error('Create invoice error:', e);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/invoices/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email phone company address')
      .populate('project', 'name')
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { invoice } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/invoices/:id
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'sales'),
  logActivity('Invoice updated', 'invoice', 'medium'),
  async (req, res) => {
    try {
      if (req.body.client) {
        const c = await Client.findById(req.body.client).select('name').lean();
        if (c) req.body.clientName = c.name;
      }
      const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      res.json({ success: true, message: 'Invoice updated', data: { invoice } });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /api/invoices/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'sales'),
  logActivity('Invoice deleted', 'invoice', 'high'),
  async (req, res) => {
    try {
      const invoice = await Invoice.findByIdAndDelete(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
      res.json({ success: true, message: 'Invoice deleted' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/invoices/:id/send
router.post('/:id/send', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice marked as sent', data: { invoice } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/invoices/:id/payment
router.post('/:id/payment', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const payment = {
      amount: Number(req.body.amount) || 0,
      method: req.body.method || 'bank_transfer',
      date: req.body.date ? new Date(req.body.date) : new Date(),
      reference: req.body.reference || '',
      recordedBy: req.user._id,
    };
    invoice.payments.push(payment);

    const totalPaid = invoice.payments.reduce((s, p) => s + (p.amount || 0), 0);
    invoice.paidAmount = totalPaid;
    invoice.totalPaidSoFar = totalPaid;
    // If budget exists, remaining = budget - totalPaid; otherwise fall back to invoice total
    const base = invoice.budget > 0 ? invoice.budget : invoice.total;
    invoice.remainingAmount = Math.max(0, base - totalPaid);
    invoice.status = totalPaid >= invoice.total ? 'paid' : 'partial';
    await invoice.save();

    // Auto-create accounting income entry when payment recorded
    await Transaction.create({
      type: 'income',
      category: 'Invoice Payment',
      amount: payment.amount,
      description: `Payment for ${invoice.invoiceNumber}${invoice.clientName ? ' — ' + invoice.clientName : ''}`,
      reference: payment.reference || invoice.invoiceNumber,
      date: payment.date,
      invoice: invoice._id,
      project: invoice.project || undefined,
      recordedBy: req.user._id,
    });

    res.json({ success: true, message: 'Payment recorded', data: { invoice } });
  } catch (e) {
    console.error('Payment error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/invoices/:id/send-email
router.post('/:id/send-email', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const clientDetails = invoice.client ? await resolveClient(invoice.client) : null;
    const clientEmail = clientDetails?.email;
    if (!clientEmail) return res.status(400).json({ success: false, message: 'Client has no email address' });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const itemsHtml = (invoice.items || []).map(item =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${item.description || ''}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty || 1}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${Number(item.rate || 0).toLocaleString()}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${((item.qty || 1) * (item.rate || 0)).toLocaleString()}</td>
      </tr>`
    ).join('');

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Parnets CRM'}" <${process.env.SMTP_USER}>`,
      to: clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} — Parnets Networks Pvt. Ltd.`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
        <div style="background:linear-gradient(135deg,#16a34a,#2563eb);padding:24px;border-radius:12px 12px 0 0">
          <h2 style="color:#fff;margin:0">Invoice ${invoice.invoiceNumber}</h2>
          ${invoice.dueDate ? `<p style="color:rgba(255,255,255,0.85);margin:4px 0 0">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>` : ''}
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <p>Dear ${invoice.clientName || 'Client'},</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="background:#f8fafc">
              <th style="padding:8px 12px;text-align:left">Description</th>
              <th style="padding:8px 12px;text-align:center">Qty</th>
              <th style="padding:8px 12px;text-align:right">Rate</th>
              <th style="padding:8px 12px;text-align:right">Amount</th>
            </tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr><td colspan="3" style="padding:6px 12px;text-align:right">Subtotal</td><td style="padding:6px 12px;text-align:right">₹${Number(invoice.subtotal || 0).toLocaleString()}</td></tr>
              ${invoice.tax ? `<tr><td colspan="3" style="padding:6px 12px;text-align:right">GST</td><td style="padding:6px 12px;text-align:right">₹${Number(invoice.tax || 0).toLocaleString()}</td></tr>` : ''}
              <tr style="font-weight:bold"><td colspan="3" style="padding:8px 12px;text-align:right">Total</td><td style="padding:8px 12px;text-align:right">₹${Number(invoice.total || 0).toLocaleString()}</td></tr>
            </tfoot>
          </table>
          ${invoice.notes ? `<p style="color:#64748b;font-size:14px"><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          <p style="margin-top:24px">Regards,<br><strong>Parnets Networks Pvt. Ltd.</strong></p>
        </div>
      </div>`,
    });

    await Invoice.findByIdAndUpdate(invoice._id, { status: 'sent', sentAt: new Date(), sentVia: 'email' });
    res.json({ success: true, message: `Invoice sent to ${clientEmail}` });
  } catch (e) {
    console.error('Send invoice email error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to send email' });
  }
});

// POST /api/invoices/:id/send-whatsapp
router.post('/:id/send-whatsapp', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const clientDetails = invoice.client ? await resolveClient(invoice.client) : null;
    const clientPhone = clientDetails?.phone || invoice.clientPhone;
    if (!clientPhone) return res.status(400).json({ success: false, message: 'Client has no phone number' });

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;
    if (!TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID === 'your-twilio-account-sid') {
      return res.status(503).json({ success: false, message: 'WhatsApp (Twilio) not configured.' });
    }

    const itemLines = (invoice.items || []).map(i => `• ${i.description}: ₹${((i.qty || 1) * (i.rate || 0)).toLocaleString()}`).join('\n');
    const message = `*Invoice ${invoice.invoiceNumber}*${invoice.installmentLabel ? '\nInstallment: ' + invoice.installmentLabel : ''}\n\n${itemLines}\n\n*Amount: ₹${Number(invoice.total || 0).toLocaleString()}*${invoice.remainingAmount > 0 ? '\nRemaining: ₹' + Number(invoice.remainingAmount).toLocaleString('en-IN') : ''}\n${invoice.dueDate ? `Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}` : ''}\n\nRegards,\nParnets Software India Pvt Ltd`;

    const toNumber = `whatsapp:+91${clientPhone.replace(/\D/g, '').slice(-10)}`;
    const authHeader = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886', To: toNumber, Body: message }),
      }
    );
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) return res.status(400).json({ success: false, message: twilioData.message || 'WhatsApp send failed' });

    await Invoice.findByIdAndUpdate(invoice._id, { status: 'sent', sentAt: new Date(), sentVia: 'whatsapp' });
    res.json({ success: true, message: `Invoice sent via WhatsApp to ${clientPhone}` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed to send WhatsApp' });
  }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email phone company address')
      .populate('project', 'name')
      .lean();
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Fetch all sibling invoices from same quotation for installment schedule
    let siblingInvoices = [];
    if (invoice.fromQuote) {
      siblingInvoices = await Invoice.find({ fromQuote: invoice.fromQuote })
        .sort({ installmentNumber: 1, createdAt: 1 })
        .lean();
    }

    const clientDetails = invoice.client || null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 90).fill('#16a34a');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('INVOICE', 50, 22);
    doc.fontSize(11).font('Helvetica').text(invoice.invoiceNumber, 50, 52);
    if (invoice.installmentLabel) doc.fontSize(10).text(`(${invoice.installmentLabel})`, 50, 67);
    doc.fontSize(10).text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 350, 22, { align: 'right', width: 200 });
    if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 350, 38, { align: 'right', width: 200 });
    if (invoice.quotationNumber) doc.text(`Ref: ${invoice.quotationNumber}`, 350, 54, { align: 'right', width: 200 });
    doc.fillColor('#1e293b');

    // FROM / TO
    let y = 108;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('FROM', 50, y);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('Parnets Software India Pvt Ltd', 50, y + 14);
    doc.fontSize(9).font('Helvetica').fillColor('#475569')
      .text('No. 12, Tech Park, Anna Nagar', 50, y + 28)
      .text('Chennai, Tamil Nadu - 600040', 50, y + 41)
      .text('Phone: +91 98765 43210', 50, y + 54)
      .text('Email: billing@parnets.in', 50, y + 67)
      .text('GSTIN: 33AAACP1234F1Z5', 50, y + 80);

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('TO', 300, y);
    const cName = clientDetails?.name || invoice.clientName || '—';
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(cName, 300, y + 14);
    let toY = y + 28;
    if (clientDetails?.company) { doc.fontSize(9).font('Helvetica').fillColor('#475569').text(clientDetails.company, 300, toY); toY += 13; }
    const addr = clientDetails?.address || invoice.clientAddress || '';
    if (addr) { doc.fontSize(9).font('Helvetica').fillColor('#475569').text(addr, 300, toY, { width: 200 }); toY += 13; }
    const phone = clientDetails?.phone || invoice.clientPhone || '';
    if (phone) { doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Phone: ${phone}`, 300, toY); toY += 13; }
    if (clientDetails?.email) { doc.fontSize(9).font('Helvetica').fillColor('#475569').text(`Email: ${clientDetails.email}`, 300, toY); }

    y = 210;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
    y += 12;

    const projectName = invoice.project?.name || invoice.projectName || '';
    if (projectName) { doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('PROJECT', 50, y); doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(projectName, 130, y); y += 16; }
    if (invoice.description) { doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('DESCRIPTION', 50, y); doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(invoice.description, 130, y, { width: 415 }); y += 16; }
    if (invoice.installmentLabel) { doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('INSTALLMENT', 50, y); doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(invoice.installmentLabel, 130, y); y += 16; }

    y += 4;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').stroke();
    y += 14;

    // Line items
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('Invoice Details', 50, y); y += 18;
    doc.rect(50, y, 495, 22).fill('#f0fdf4');
    doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, y + 6).text('QTY', 340, y + 6, { width: 50, align: 'center' })
      .text('RATE', 400, y + 6, { width: 70, align: 'right' }).text('AMOUNT', 480, y + 6, { align: 'right', width: 55 });
    y += 22;

    (invoice.items || []).forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, y, 495, 20).fill('#f8fafc');
      const qty = item.qty || 1;
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(item.description || '', 60, y + 4, { width: 270 })
        .text(String(qty), 340, y + 4, { width: 50, align: 'center' })
        .text(`₹${Number(item.rate || 0).toLocaleString('en-IN')}`, 400, y + 4, { width: 70, align: 'right' })
        .text(`₹${Number(qty * (item.rate || 0)).toLocaleString('en-IN')}`, 480, y + 4, { align: 'right', width: 55 });
      doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor('#f1f5f9').stroke();
      y += 20;
    });

    // Totals
    y += 10;
    const rowT = (label, value, bold = false) => {
      if (bold) doc.rect(50, y, 495, 28).fill('#16a34a');
      doc.fillColor(bold ? '#ffffff' : '#1e293b').fontSize(bold ? 12 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, 60, y + (bold ? 8 : 4))
        .text(`₹${Number(value).toLocaleString('en-IN')}`, 480, y + (bold ? 8 : 4), { align: 'right', width: 55 });
      y += bold ? 38 : 20;
    };
    rowT('Subtotal', invoice.subtotal || 0);
    if (invoice.tax) rowT('GST', invoice.tax);
    if (invoice.discount) rowT('Discount', -(invoice.discount));
    rowT('INVOICE TOTAL', invoice.total || 0, true);

    if (invoice.budget > 0 || siblingInvoices.length > 0) {
      y += 8;
      doc.rect(50, y, 495, 22).fill('#1e3a5f');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('PAYMENT SCHEDULE', 60, y + 6); y += 22;

      // Header row
      doc.rect(50, y, 495, 18).fill('#f0f4ff');
      doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
        .text('INSTALLMENT', 60, y + 4)
        .text('AMOUNT', 280, y + 4, { width: 80, align: 'right' })
        .text('STATUS', 370, y + 4, { width: 70, align: 'center' })
        .text('PAID', 450, y + 4, { width: 80, align: 'right' });
      y += 18;

      const invoicesToShow = siblingInvoices.length > 0 ? siblingInvoices : [invoice];
      let grandTotalPaid = 0;

      invoicesToShow.forEach((inv, i) => {
        const isCurrent = String(inv._id) === String(invoice._id);
        const instPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        grandTotalPaid += instPaid;

        if (isCurrent) doc.rect(50, y, 495, 20).fill('#fefce8');
        else if (i % 2 === 0) doc.rect(50, y, 495, 20).fill('#f8fafc');

        const statusColor = inv.status === 'paid' ? '#16a34a' : inv.status === 'partial' ? '#d97706' : '#64748b';
        const label = inv.installmentLabel || inv.invoiceNumber || `Installment ${i + 1}`;

        doc.fillColor(isCurrent ? '#92400e' : '#1e293b').fontSize(9).font(isCurrent ? 'Helvetica-Bold' : 'Helvetica')
          .text(`${label}${isCurrent ? ' ◀ THIS' : ''}`, 60, y + 5, { width: 210 })
          .text(`₹${Number(inv.total || 0).toLocaleString('en-IN')}`, 280, y + 5, { width: 80, align: 'right' });
        doc.fillColor(statusColor).fontSize(9).font('Helvetica-Bold')
          .text((inv.status || 'draft').toUpperCase(), 370, y + 5, { width: 70, align: 'center' });
        doc.fillColor('#16a34a').fontSize(9).font('Helvetica')
          .text(`₹${instPaid.toLocaleString('en-IN')}`, 450, y + 5, { width: 80, align: 'right' });
        doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor('#e2e8f0').stroke();
        y += 20;
      });

      // Totals row
      y += 4;
      const totalBudget = invoice.budget || invoicesToShow.reduce((s, inv) => s + (inv.total || 0), 0);
      const totalRemaining = Math.max(0, totalBudget - grandTotalPaid);

      doc.rect(50, y, 495, 20).fill('#f0fdf4');
      doc.fillColor('#166534').fontSize(9).font('Helvetica-Bold')
        .text('PROJECT TOTAL', 60, y + 5)
        .text(`₹${totalBudget.toLocaleString('en-IN')}`, 280, y + 5, { width: 80, align: 'right' });
      doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold')
        .text(`₹${grandTotalPaid.toLocaleString('en-IN')}`, 450, y + 5, { width: 80, align: 'right' });
      y += 20;

      doc.rect(50, y, 495, 20).fill('#fef2f2');
      doc.fillColor('#dc2626').fontSize(9).font('Helvetica-Bold')
        .text('REMAINING BALANCE', 60, y + 5)
        .text(`₹${totalRemaining.toLocaleString('en-IN')}`, 450, y + 5, { width: 80, align: 'right' });
      y += 24;
    }

    if ((invoice.payments || []).length > 0) {
      y += 12;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Payment History', 50, y); y += 16;
      doc.rect(50, y, 495, 20).fill('#f8fafc');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
        .text('DATE', 60, y + 5).text('METHOD', 180, y + 5).text('REFERENCE', 310, y + 5).text('AMOUNT', 480, y + 5, { align: 'right', width: 55 });
      y += 20;
      invoice.payments.forEach(p => {
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
          .text(p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—', 60, y + 3)
          .text((p.method || '').replace('_', ' '), 180, y + 3)
          .text(p.reference || '—', 310, y + 3)
          .text(`₹${Number(p.amount || 0).toLocaleString('en-IN')}`, 480, y + 3, { align: 'right', width: 55 });
        y += 18;
      });
    }

    if (invoice.notes) {
      y += 10;
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('Notes:', 50, y);
      doc.font('Helvetica').text(invoice.notes, 50, y + 14, { width: 495 });
    }

    const footerY = doc.page.height - 55;
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#e2e8f0').stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Parnets Software India Pvt Ltd | Computer-generated invoice.', 50, footerY, { align: 'center', width: 495 })
      .text('No. 12, Tech Park, Anna Nagar, Chennai - 600040 | billing@parnets.in', 50, footerY + 14, { align: 'center', width: 495 });

    doc.end();
  } catch (e) {
    console.error('PDF error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
});

export default router;
