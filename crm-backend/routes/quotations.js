import express from 'express';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import Quotation from '../models/Quotation.js';
import Project from '../models/Project.js';
import Client from '../models/Client.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const router = express.Router();
const ADMIN_SALES = ['super_admin', 'admin', 'sub_admin', 'sales'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcTotals(services = [], developmentBudget = 0) {
  const servicesTotal = services.reduce((s, sv) => s + (Number(sv.amount) || 0), 0);
  const subtotal = Number(developmentBudget) + servicesTotal;
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const grandTotal = subtotal + cgst + sgst;
  return { servicesTotal, subtotal, cgst, sgst, grandTotal };
}

async function populatedQuotation(id) {
  return Quotation.findById(id)
    .populate({ path: 'project', select: 'name status' })
    .populate({ path: 'client', select: 'name email phone company' })
    .populate({ path: 'createdBy', select: 'name email' })
    .lean();
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

// GET /api/quotations
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, project, client } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (project) filter.project = project;
    if (client) filter.client = client;

    const total = await Quotation.countDocuments(filter);
    const quotations = await Quotation.find(filter)
      .populate({ path: 'project', select: 'name' })
      .populate({ path: 'client', select: 'name company' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: { quotations, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    console.error('GET /api/quotations error:', e);
    res.status(500).json({ success: false, message: e.message || 'Server error' });
  }
});

// POST /api/quotations
router.post('/', authenticate, authorize(...ADMIN_SALES),
  logActivity('Quotation created', 'quotation', 'medium'),
  async (req, res) => {
    try {
      const { project, totalBudget, developmentBudget, services = [], notes, paymentTerms, validUntil } = req.body;
      if (!project) return res.status(400).json({ success: false, message: 'Project is required' });

      // Auto-resolve client from project
      const proj = await Project.findById(project).select('client').lean();
      if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });

      const { servicesTotal, subtotal, cgst, sgst, grandTotal } = calcTotals(services, developmentBudget);

      // Generate unique quotation number before insert
      const quotationNumber = await Quotation.generateQuotationNumber();

      const quotation = await Quotation.create({
        quotationNumber,
        project,
        client: proj.client,
        totalBudget: Number(totalBudget) || 0,
        developmentBudget: Number(developmentBudget) || 0,
        services,
        servicesTotal,
        subtotal,
        cgst,
        sgst,
        grandTotal,
        notes,
        paymentTerms,
        validUntil,
        createdBy: req.user._id,
        status: 'pending',
      });

      const populated = await populatedQuotation(quotation._id);
      res.status(201).json({ success: true, message: 'Quotation created successfully', data: { quotation: populated } });
    } catch (e) {
      console.error('Create quotation error:', e);
      if (e.code === 11000) {
        return res.status(400).json({ success: false, message: 'Quotation number already exists. Please try again.' });
      }
      res.status(500).json({ success: false, message: 'Something went wrong' });
    }
  }
);

// GET /api/quotations/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: { quotation } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/quotations/:id
router.put('/:id', authenticate, authorize(...ADMIN_SALES),
  logActivity('Quotation updated', 'quotation', 'medium'),
  async (req, res) => {
    try {
      const { project, totalBudget, developmentBudget, services = [], notes, paymentTerms, validUntil } = req.body;

      const update = { notes, paymentTerms, validUntil };
      if (totalBudget !== undefined) update.totalBudget = Number(totalBudget);
      if (developmentBudget !== undefined) update.developmentBudget = Number(developmentBudget);
      if (services) {
        update.services = services;
        const { servicesTotal, subtotal, cgst, sgst, grandTotal } = calcTotals(services, developmentBudget ?? 0);
        update.servicesTotal = servicesTotal;
        update.subtotal = subtotal;
        update.cgst = cgst;
        update.sgst = sgst;
        update.grandTotal = grandTotal;
      }
      if (project) {
        const proj = await Project.findById(project).select('client').lean();
        if (proj) { update.project = project; update.client = proj.client; }
      }

      const quotation = await Quotation.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
      const populated = await populatedQuotation(quotation._id);
      res.json({ success: true, message: 'Quotation updated', data: { quotation: populated } });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// DELETE /api/quotations/:id
router.delete('/:id', authenticate, authorize('super_admin', 'admin', 'sales'),
  logActivity('Quotation deleted', 'quotation', 'high'),
  async (req, res) => {
    try {
      const quotation = await Quotation.findByIdAndDelete(req.params.id);
      if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
      res.json({ success: true, message: 'Quotation deleted' });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ── Status Update (Admin only) ────────────────────────────────────────────────

// PATCH /api/quotations/:id/status
router.patch('/:id/status', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be pending, approved, or rejected.' });
    }
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    const populated = await populatedQuotation(quotation._id);
    res.json({ success: true, message: `Quotation marked as ${status}`, data: { quotation: populated } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Send via Email ────────────────────────────────────────────────────────────

// POST /api/quotations/:id/send-email
router.post('/:id/send-email', authenticate, authorize(...ADMIN_SALES), async (req, res) => {
  try {
    const { SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_USER || SMTP_USER.includes('your-real-gmail') || !SMTP_PASS || SMTP_PASS.includes('xxxx')) {
      return res.status(503).json({ success: false, message: 'Email not configured. Set SMTP_USER and SMTP_PASS in .env (use a Gmail App Password).' });
    }

    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const clientEmail = quotation.client?.email;
    if (!clientEmail) return res.status(400).json({ success: false, message: 'Client has no email address' });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const servicesHtml = quotation.services?.length
      ? quotation.services.map(s => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${s.serviceName}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${Number(s.amount).toLocaleString()}</td></tr>`).join('')
      : '';

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Parnets CRM'}" <${process.env.SMTP_USER}>`,
      to: clientEmail,
      subject: `Quotation ${quotation.quotationNumber} — ${quotation.project?.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
          <div style="background:linear-gradient(135deg,#2563eb,#f97316);padding:24px;border-radius:12px 12px 0 0">
            <h2 style="color:#fff;margin:0">Quotation ${quotation.quotationNumber}</h2>
            <p style="color:rgba(255,255,255,0.85);margin:4px 0 0">Project: ${quotation.project?.name}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
            <p>Dear ${quotation.client?.name},</p>
            <p>Please find below the quotation details for your project.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead><tr style="background:#f8fafc"><th style="padding:8px 12px;text-align:left">Description</th><th style="padding:8px 12px;text-align:right">Amount</th></tr></thead>
              <tbody>
                <tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">Development Budget</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">₹${Number(quotation.developmentBudget).toLocaleString()}</td></tr>
                ${servicesHtml}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc;font-weight:bold"><td style="padding:8px 12px">Grand Total</td><td style="padding:8px 12px;text-align:right">₹${Number(quotation.grandTotal).toLocaleString()}</td></tr>
              </tfoot>
            </table>
            ${quotation.notes ? `<p style="color:#64748b;font-size:14px"><strong>Notes:</strong> ${quotation.notes}</p>` : ''}
            ${quotation.validUntil ? `<p style="color:#64748b;font-size:14px">Valid until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}</p>` : ''}
            <p style="margin-top:24px">Regards,<br><strong>Parnets Networks Pvt. Ltd.</strong></p>
          </div>
        </div>`,
    });

    await Quotation.findByIdAndUpdate(req.params.id, { isSent: true, sentAt: new Date(), sentVia: 'email' });
    res.json({ success: true, message: `Quotation sent to ${clientEmail}` });
  } catch (e) {
    console.error('Send email error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to send email' });
  }
});

// ── Send via WhatsApp (wa.me deep link) ───────────────────────────────────────

// POST /api/quotations/:id/send-whatsapp
router.post('/:id/send-whatsapp', authenticate, authorize(...ADMIN_SALES), async (req, res) => {
  try {
    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const clientPhone = quotation.client?.phone;
    if (!clientPhone) return res.status(400).json({ success: false, message: 'Client has no phone number' });

    const serviceLines = quotation.services?.map(s => `• ${s.serviceName}: ₹${Number(s.amount).toLocaleString('en-IN')}`).join('\n') || '';
    const message = [
      `*Quotation ${quotation.quotationNumber}*`,
      `Project: ${quotation.project?.name}`,
      '',
      `Development Budget: ₹${Number(quotation.developmentBudget).toLocaleString('en-IN')}`,
      serviceLines,
      '',
      `*Grand Total: ₹${Number(quotation.grandTotal).toLocaleString('en-IN')}*`,
      quotation.validUntil ? `Valid until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}` : '',
      '',
      'Regards,\nParnets Networks Pvt. Ltd.',
    ].filter(l => l !== undefined).join('\n').trim();

    const digits = clientPhone.replace(/\D/g, '');
    // Ensure country code — prepend 91 if 10-digit Indian number
    const e164 = digits.length === 10 ? `91${digits}` : digits;
    const waUrl = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;

    await Quotation.findByIdAndUpdate(req.params.id, { isSent: true, sentAt: new Date(), sentVia: 'whatsapp' });
    res.json({ success: true, message: `WhatsApp link ready for ${clientPhone}`, data: { waUrl } });
  } catch (e) {
    console.error('WhatsApp error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to generate WhatsApp link' });
  }
});

// ── PDF Generation ────────────────────────────────────────────────────────────

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quotationNumber}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('QUOTATION', 50, 25);
    doc.fontSize(11).font('Helvetica').text(`${quotation.quotationNumber}`, 50, 52);
    doc.text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-IN')}`, 350, 25, { align: 'right', width: 200 });
    if (quotation.validUntil) {
      doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`, 350, 42, { align: 'right', width: 200 });
    }

    doc.fillColor('#1e293b').moveDown(3);

    // Company & Client info
    doc.fontSize(10).font('Helvetica-Bold').text('FROM', 50, 100);
    doc.font('Helvetica').text('Parnets Networks Pvt. Ltd.', 50, 115);

    doc.font('Helvetica-Bold').text('TO', 300, 100);
    doc.font('Helvetica').text(quotation.client?.name || '—', 300, 115);
    doc.text(quotation.client?.company || '', 300, 130);
    doc.text(quotation.client?.email || '', 300, 145);
    doc.text(quotation.client?.phone || '', 300, 160);

    // Project
    doc.moveDown(5);
    doc.font('Helvetica-Bold').fontSize(11).text('Project:', 50, 185);
    doc.font('Helvetica').text(quotation.project?.name || '—', 120, 185);

    // Divider
    doc.moveTo(50, 205).lineTo(545, 205).strokeColor('#e2e8f0').stroke();

    // Budget section
    let y = 220;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e293b').text('Budget Summary', 50, y);
    y += 20;

    // Table header
    doc.rect(50, y, 495, 22).fill('#f8fafc');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, y + 6)
      .text('AMOUNT', 480, y + 6, { align: 'right', width: 55 });
    y += 22;

    const row = (label, amount, shade = false) => {
      if (shade) doc.rect(50, y, 495, 20).fill('#f8fafc');
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(label, 60, y + 4)
        .text(`₹${Number(amount).toLocaleString('en-IN')}`, 480, y + 4, { align: 'right', width: 55 });
      doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor('#f1f5f9').stroke();
      y += 20;
    };

    row('Development Budget', quotation.developmentBudget, false);

    if (quotation.services?.length) {
      y += 10;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text('Add-on Services', 50, y);
      y += 18;
      doc.rect(50, y, 495, 22).fill('#f8fafc');
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
        .text('SERVICE', 60, y + 6)
        .text('AMOUNT', 480, y + 6, { align: 'right', width: 55 });
      y += 22;
      quotation.services.forEach((s, i) => row(s.serviceName, s.amount, i % 2 === 0));
    }

    // Subtotal + GST + Grand total
    y += 5;
    row('Subtotal', quotation.subtotal ?? quotation.grandTotal, false);
    row(`CGST (9%)`, quotation.cgst ?? 0, true);
    row(`SGST (9%)`, quotation.sgst ?? 0, false);

    // Grand total
    y += 5;
    doc.rect(50, y, 495, 28).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
      .text('GRAND TOTAL', 60, y + 8)
      .text(`₹${Number(quotation.grandTotal).toLocaleString('en-IN')}`, 480, y + 8, { align: 'right', width: 55 });
    y += 38;

    // Notes
    if (quotation.notes) {
      y += 10;
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('Notes:', 50, y);
      doc.font('Helvetica').text(quotation.notes, 50, y + 15, { width: 495 });
      y += 15 + doc.heightOfString(quotation.notes, { width: 495 });
    }

    // Payment Terms
    if (quotation.paymentTerms) {
      y += 10;
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('Payment Terms:', 50, y);
      y += 15;
      quotation.paymentTerms.split('\n').filter(Boolean).forEach((line, i) => {
        doc.font('Helvetica').fillColor('#1e293b').text(`${i + 1}. ${line}`, 60, y, { width: 485 });
        y += doc.heightOfString(`${i + 1}. ${line}`, { width: 485 }) + 4;
      });
    }

    // Footer
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY - 10).lineTo(545, footerY - 10).strokeColor('#e2e8f0').stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Parnets Networks Pvt. Ltd. | This quotation is computer generated.', 50, footerY, { align: 'center', width: 495 });

    doc.end();
  } catch (e) {
    console.error('PDF error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
});

export default router;
