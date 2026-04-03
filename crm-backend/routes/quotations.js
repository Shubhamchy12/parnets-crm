import express from 'express';
import PDFDocument from 'pdfkit';
import emailService from '../services/emailService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Quotation from '../models/Quotation.js';
import Project from '../models/Project.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const ADMIN_SALES = ['super_admin', 'admin', 'sub_admin', 'sales'];

// Generate Quotation PDF Buffer
async function generateQuotationPDF(quotation) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, autoFirstPage: false });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.addPage({ size: 'A4', margin: 0 });

      const pageW = doc.page.width;   // 595
      const pageH = doc.page.height;  // 842
      const L = 40, R = pageW - 40;
      const contentW = R - L;         // 515

      // ── HEADER BAND ───────────────────────────────────────────────────────────
      doc.rect(0, 0, pageW, 140).fill('#ffffff');

      // Logo
      const logoPath = path.join(__dirname, '../../crm-frontent/public/logo.jpg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, L, 20, { fit: [120, 60] });
      }

      // Company name below logo - centered
      doc.fillColor('#1e3a8a').fontSize(18).font('Helvetica-Bold')
        .text('ParNets Software India Pvt Ltd', L, 88, { width: contentW, align: 'center', lineBreak: false });

      // Address details - centered
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
        .text('So104/1/50, Singapura Main Rd,', L, 110, { width: contentW, align: 'center', lineBreak: false })
        .text('Singapura Village, Varadharaja Nagar,', L, 122, { width: contentW, align: 'center', lineBreak: false })
        .text('Vidyaranyapura, Bengaluru, Karnataka 560097', L, 134, { width: contentW, align: 'center', lineBreak: false });

      // GST and Contact details - centered
      doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica-Bold')
        .text('GST: 29AANCP7155K1ZN', L, 150, { width: contentW, align: 'center', lineBreak: false });
      doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
        .text('Contact: 095909 26068', L, 162, { width: contentW / 2 - 10, align: 'right', lineBreak: false });
      doc.fillColor('#4f46e5').fontSize(9).font('Helvetica')
        .text('hello@parnetsgroup.com', L + contentW / 2 + 10, 162, { width: contentW / 2 - 10, align: 'left', lineBreak: false });

      // QUOTATION title - right side
      doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold')
        .text('QUOTATION', 320, 30, { width: 235, align: 'right', lineBreak: false });
      doc.fillColor('#64748b').fontSize(10).font('Helvetica')
        .text(quotation.quotationNumber, 320, 60, { width: 235, align: 'right', lineBreak: false });

      let y = 175;

      // ── META INFO ROW ─────────────────────────────────────────────────────────
      doc.rect(L, y, contentW, 22).fill('#f1f5f9').stroke('#e2e8f0');
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-IN')}`, L + 10, y + 7, { lineBreak: false })
        .text(`Status: ${(quotation.status || 'pending').toUpperCase()}`, L + 160, y + 7, { lineBreak: false });
      if (quotation.validUntil) {
        doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`, L + 310, y + 7, { lineBreak: false });
      }
      y += 30;

      // ── FROM / TO BOXES ───────────────────────────────────────────────────────
      const boxW = (contentW - 12) / 2;
      const boxH = 80;

      // FROM
      doc.rect(L, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
      doc.rect(L, y, boxW, 20).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('FROM', L + 10, y + 6, { lineBreak: false });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
        .text('ParNets Software India Pvt Ltd', L + 10, y + 26, { width: boxW - 20, lineBreak: false });
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
        .text('So104/1/50, Singapura Main Rd, Vidyaranyapura', L + 10, y + 41, { width: boxW - 20, lineBreak: false })
        .text('Bengaluru, Karnataka 560097', L + 10, y + 53, { width: boxW - 20, lineBreak: false })
        .text('GST: 29AANCP7155K1ZN', L + 10, y + 65, { width: boxW - 20, lineBreak: false })
        .text('hello@parnetsgroup.com  |  095909 26068', L + 10, y + 77, { width: boxW - 20, lineBreak: false });

      // TO
      const toX = L + boxW + 12;
      doc.rect(toX, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
      doc.rect(toX, y, boxW, 20).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('BILL TO', toX + 10, y + 6, { lineBreak: false });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
        .text(quotation.client?.name || '—', toX + 10, y + 26, { width: boxW - 20, lineBreak: false });
      doc.fillColor('#475569').fontSize(9).font('Helvetica');
      let cy = y + 41;
      if (quotation.client?.company) { doc.text(quotation.client.company, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
      if (quotation.client?.email)   { doc.text(quotation.client.email,   toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
      if (quotation.client?.phone)   { doc.text(quotation.client.phone,   toX + 10, cy, { width: boxW - 20, lineBreak: false }); }
      y += boxH + 14;

      // ── PROJECT ROW ───────────────────────────────────────────────────────────
      doc.rect(L, y, contentW, 24).fill('#eff6ff').stroke('#bfdbfe');
      doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
        .text('PROJECT:', L + 10, y + 7, { lineBreak: false });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(quotation.project?.name || '—', L + 80, y + 7, { width: contentW - 90, lineBreak: false });
      y += 32;

      // ── BUDGET TABLE ──────────────────────────────────────────────────────────
      const rH = 22;

      // Table header
      doc.rect(L, y, contentW, rH).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        .text('DESCRIPTION', L + 10, y + 6, { lineBreak: false })
        .text('AMOUNT (INR)', R - 10, y + 6, { align: 'right', width: 110, lineBreak: false });
      y += rH;

      const trow = (label, amount, shade = false) => {
        if (shade) doc.rect(L, y, contentW, rH).fill('#f8fafc');
        doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
          .text(label, L + 10, y + 6, { width: contentW - 140, lineBreak: false });
        doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
          .text(`Rs. ${Number(amount).toLocaleString('en-IN')}`, R - 120, y + 6, { align: 'right', width: 110, lineBreak: false });
        doc.moveTo(L, y + rH).lineTo(R, y + rH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        y += rH;
      };

      trow('Development Budget', quotation.developmentBudget, false);
      if (quotation.services?.length) {
        quotation.services.forEach((s, i) => trow(s.serviceName, s.amount, i % 2 === 0));
      }

      // Totals separator
      doc.moveTo(L, y + 2).lineTo(R, y + 2).strokeColor('#94a3b8').lineWidth(1).stroke();
      y += 8;

      const srow = (label, amount, bold = false, bg = null) => {
        if (bg) doc.rect(L, y, contentW, rH).fill(bg);
        doc.fillColor(bg === '#1e3a8a' ? '#ffffff' : '#475569')
          .fontSize(bold ? 11 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(label, L + 10, y + 6, { lineBreak: false });
        doc.fillColor(bg === '#1e3a8a' ? '#ffffff' : '#475569')
          .fontSize(bold ? 11 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(`Rs. ${Number(amount).toLocaleString('en-IN')}`, R - 120, y + 6, { align: 'right', width: 110, lineBreak: false });
        y += rH;
      };

      srow('Subtotal', quotation.subtotal ?? 0);
      srow('CGST (9%)', quotation.cgst ?? 0, false, '#f8fafc');
      srow('SGST (9%)', quotation.sgst ?? 0);
      y += 4;
      doc.rect(L, y, contentW, 28).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('GRAND TOTAL (Incl. GST)', L + 10, y + 8, { lineBreak: false });
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text(`Rs. ${Number(quotation.grandTotal).toLocaleString('en-IN')}`, R - 120, y + 8, { align: 'right', width: 110, lineBreak: false });
      y += 36;

      // ── NOTES ─────────────────────────────────────────────────────────────────
      if (quotation.notes) {
        doc.rect(L, y, contentW, 20).fill('#fef9c3');
        doc.fillColor('#854d0e').fontSize(10).font('Helvetica-Bold')
          .text('NOTES', L + 10, y + 5, { lineBreak: false });
        y += 20;
        const noteLines = quotation.notes.split('\n').filter(Boolean);
        noteLines.forEach(line => {
          doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
            .text(line, L + 10, y + 4, { width: contentW - 20, lineBreak: false });
          y += 16;
        });
        y += 6;
      }

      // ── PAYMENT TERMS ─────────────────────────────────────────────────────────
      if (quotation.paymentTerms) {
        doc.rect(L, y, contentW, 20).fill('#eff6ff');
        doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
          .text('PAYMENT TERMS', L + 10, y + 5, { lineBreak: false });
        y += 20;
        quotation.paymentTerms.split('\n').filter(Boolean).forEach((line, i) => {
          doc.rect(L, y, 16, 16).fill('#2563eb');
          doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
            .text(`${i + 1}`, L + 5, y + 4, { lineBreak: false });
          doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
            .text(line, L + 22, y + 3, { width: contentW - 30, lineBreak: false });
          y += 20;
        });
        y += 6;
      }

      // ── SIGNATURE AREA ────────────────────────────────────────────────────────
      y += 10;
      doc.moveTo(L, y).lineTo(L + 160, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
      doc.moveTo(R - 160, y).lineTo(R, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text('Authorized Signature', L, y + 4, { width: 160, align: 'center', lineBreak: false })
        .text('Client Signature', R - 160, y + 4, { width: 160, align: 'center', lineBreak: false });

      // ── FOOTER ────────────────────────────────────────────────────────────────
      const fY = pageH - 30;
      doc.rect(0, fY, pageW, 30).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('ParNets Software India Pvt Ltd', L, fY + 6, { lineBreak: false });
      doc.fillColor('#bfdbfe').fontSize(8).font('Helvetica')
        .text('This is a computer-generated quotation and does not require a physical signature.',
          L, fY + 18, { align: 'center', width: contentW, lineBreak: false });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function calcTotals(services = [], developmentBudget = 0) {
  const servicesTotal = services.reduce((s, sv) => s + (Number(sv.amount) || 0), 0);
  const subtotal = Number(developmentBudget) + servicesTotal;
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const grandTotal = subtotal + cgst + sgst;
  return { servicesTotal, subtotal, cgst, sgst, grandTotal };
}

async function populatedQuotation(id) {
  const q = await Quotation.findById(id)
    .populate({ path: 'project', select: 'name client', populate: { path: 'client', select: 'name email phone company address' } })
    .populate({ path: 'client', select: 'name email phone company address' })
    .populate({ path: 'createdBy', select: 'name email' })
    .lean();
  if (!q) return null;
  // Resolve client fallback
  const client = (q.client && q.client.name) ? q.client
               : (q.project?.client && q.project.client.name) ? q.project.client
               : null;
  const project = q.project ? { _id: q.project._id, name: q.project.name } : null;
  return { ...q, client, project };
}

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
      .populate({ path: 'project', select: 'name client', populate: { path: 'client', select: 'name company email phone address' } })
      .populate({ path: 'client', select: 'name company email phone address' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Resolve client: quotation.client first, fallback to project.client
    const resolved = quotations.map(q => {
      const client = (q.client && q.client.name) ? q.client
                   : (q.project?.client && q.project.client.name) ? q.project.client
                   : null;
      const project = q.project ? { _id: q.project._id, name: q.project.name } : null;
      return { ...q, client, project };
    });

    res.json({ success: true, data: { quotations: resolved, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
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
      const proj = await Project.findById(project).select('name client').populate('client', 'name').lean();
      if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });
      const { servicesTotal, subtotal, cgst, sgst, grandTotal } = calcTotals(services, developmentBudget);
      const quotationNumber = await Quotation.generateQuotationNumber();
      const quotation = await Quotation.create({
        quotationNumber,
        project,
        projectName: proj.name || '',
        client: proj.client?._id || proj.client,
        clientName: proj.client?.name || '',
        totalBudget: Number(totalBudget) || 0,
        developmentBudget: Number(developmentBudget) || 0,
        services, servicesTotal, subtotal, cgst, sgst, grandTotal,
        notes, paymentTerms, validUntil,
        createdBy: req.user._id, status: 'pending',
      });
      const populated = await populatedQuotation(quotation._id);
      res.status(201).json({ success: true, message: 'Quotation created successfully', data: { quotation: populated } });
    } catch (e) {
      if (e.code === 11000) return res.status(400).json({ success: false, message: 'Quotation number already exists.' });
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
      const { project, totalBudget, developmentBudget, services = [], notes, paymentTerms, validUntil, projectStartDate } = req.body;
      const update = { notes, paymentTerms, validUntil };
      
      if (projectStartDate !== undefined) update.projectStartDate = projectStartDate;
      if (totalBudget !== undefined) update.totalBudget = Number(totalBudget);
      if (developmentBudget !== undefined) update.developmentBudget = Number(developmentBudget);
      
      if (services) {
        update.services = services;
        const { servicesTotal, subtotal, cgst, sgst, grandTotal } = calcTotals(services, developmentBudget ?? 0);
        Object.assign(update, { servicesTotal, subtotal, cgst, sgst, grandTotal });
      }
      
      if (project) {
        const proj = await Project.findById(project).populate('client', 'name').lean();
        if (proj) { 
          update.project = project;
          update.projectName = proj.name || '';
          update.client = proj.client?._id || proj.client;
          update.clientName = proj.client?.name || '';
        }
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

// PATCH /api/quotations/:id/status
router.patch('/:id/status', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    const populated = await populatedQuotation(quotation._id);
    res.json({ success: true, message: `Quotation marked as ${status}`, data: { quotation: populated } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/quotations/:id/send-email - Send quotation with PDF attachment
router.post('/:id/send-email', authenticate, authorize(...ADMIN_SALES), async (req, res) => {
  try {
    console.log(`📧 Sending quotation email for ID: ${req.params.id}`);
    
    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const clientEmail = quotation.client?.email;
    const clientName = quotation.client?.name || 'Client';
    
    if (!clientEmail) {
      return res.status(400).json({ success: false, message: 'Client has no email address' });
    }

    console.log(`📧 Sending to: ${clientEmail} (${clientName})`);

    // Generate PDF buffer
    console.log('📄 Generating PDF...');
    const pdfBuffer = await generateQuotationPDF(quotation);
    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    // Prepare email HTML
    const servicesHtml = quotation.services?.length
      ? quotation.services.map(s => `<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">${s.serviceName}</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">Rs.${Number(s.amount).toLocaleString()}</td></tr>`).join('')
      : '';

    // Send email with PDF attachment
    const emailResult = await emailService.sendMail({
      to: clientEmail,
      subject: `Quotation ${quotation.quotationNumber} — Parnets Software India Pvt Ltd`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e3a8a;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">Quotation ${quotation.quotationNumber}</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0">Project: ${quotation.project?.name}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Dear ${clientName},</p>
          <p style="color:#64748b;font-size:14px">Please find attached the quotation for your project.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead><tr style="background:#f8fafc"><th style="padding:8px 12px;text-align:left">Description</th><th style="padding:8px 12px;text-align:right">Amount</th></tr></thead>
            <tbody>
              <tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9">Development Budget</td><td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;text-align:right">Rs.${Number(quotation.developmentBudget).toLocaleString()}</td></tr>
              ${servicesHtml}
            </tbody>
            <tfoot><tr style="background:#f8fafc;font-weight:bold"><td style="padding:8px 12px">Grand Total</td><td style="padding:8px 12px;text-align:right">Rs.${Number(quotation.grandTotal).toLocaleString()}</td></tr></tfoot>
          </table>
          ${quotation.notes ? `<p style="color:#64748b;font-size:14px"><strong>Notes:</strong> ${quotation.notes}</p>` : ''}
          <p style="margin-top:24px">Regards,<br><strong>Parnets Software India Pvt Ltd</strong></p>
        </div>
      </div>`,
      attachments: [{
        filename: `Quotation-${quotation.quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    // Check if email was sent successfully
    if (!emailResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: emailResult.error || 'Failed to send email' 
      });
    }

    // Update quotation status
    await Quotation.findByIdAndUpdate(req.params.id, { 
      isSent: true, 
      sentAt: new Date(), 
      sentVia: 'email' 
    });

    console.log(`✅ Quotation email sent successfully to ${clientEmail}`);
    res.json({ success: true, message: `Quotation sent to ${clientEmail}` });
    
  } catch (e) {
    console.error('❌ Send quotation email error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to send email' });
  }
});

// POST /api/quotations/:id/send-whatsapp
router.post('/:id/send-whatsapp', authenticate, authorize(...ADMIN_SALES), async (req, res) => {
  try {
    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    const clientPhone = quotation.client?.phone;
    if (!clientPhone) return res.status(400).json({ success: false, message: 'Client has no phone number' });
    const serviceLines = quotation.services?.map(s => `- ${s.serviceName}: Rs.${Number(s.amount).toLocaleString('en-IN')}`).join('\n') || '';
    const message = [
      `*Quotation ${quotation.quotationNumber}*`,
      `Project: ${quotation.project?.name}`,
      '',
      `Development Budget: Rs.${Number(quotation.developmentBudget).toLocaleString('en-IN')}`,
      serviceLines,
      '',
      `*Grand Total: Rs.${Number(quotation.grandTotal).toLocaleString('en-IN')}*`,
      quotation.validUntil ? `Valid until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}` : '',
      '',
      'Regards,\nParnets Networks Pvt. Ltd.',
    ].filter(Boolean).join('\n').trim();
    const digits = clientPhone.replace(/\D/g, '');
    const e164 = digits.length === 10 ? `91${digits}` : digits;
    const waUrl = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
    await Quotation.findByIdAndUpdate(req.params.id, { isSent: true, sentAt: new Date(), sentVia: 'whatsapp' });
    res.json({ success: true, message: `WhatsApp link ready`, data: { waUrl } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Failed' });
  }
});

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const quotation = await populatedQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quotation-${quotation.quotationNumber}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, autoFirstPage: false });
    doc.pipe(res);
    doc.addPage({ size: 'A4', margin: 0 });

    const pageW = doc.page.width;   // 595
    const pageH = doc.page.height;  // 842
    const L = 40, R = pageW - 40;
    const contentW = R - L;         // 515

    // ── HEADER BAND ───────────────────────────────────────────────────────────
    // Left col: x=40..310, Right col: x=320..555
    doc.rect(0, 0, pageW, 140).fill('#ffffff');

    // Logo
    const logoPath = path.join(__dirname, '../../crm-frontent/public/logo.jpg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, L, 20, { fit: [120, 60] });
    }

    // Company name below logo - centered
    doc.fillColor('#1e3a8a').fontSize(18).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L, 88, { width: contentW, align: 'center', lineBreak: false });

    // Address details - centered
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text('So104/1/50, Singapura Main Rd,', L, 110, { width: contentW, align: 'center', lineBreak: false })
      .text('Singapura Village, Varadharaja Nagar,', L, 122, { width: contentW, align: 'center', lineBreak: false })
      .text('Vidyaranyapura, Bengaluru, Karnataka 560097', L, 134, { width: contentW, align: 'center', lineBreak: false });

    // GST and Contact details - centered
    doc.fillColor('#1e3a8a').fontSize(9).font('Helvetica-Bold')
      .text('GST: 29AANCP7155K1ZN', L, 150, { width: contentW, align: 'center', lineBreak: false });
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('Contact: 095909 26068', L, 162, { width: contentW / 2 - 10, align: 'right', lineBreak: false });
    doc.fillColor('#4f46e5').fontSize(9).font('Helvetica')
      .text('hello@parnetsgroup.com', L + contentW / 2 + 10, 162, { width: contentW / 2 - 10, align: 'left', lineBreak: false });

    // QUOTATION title - right side
    doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold')
      .text('QUOTATION', 320, 30, { width: 235, align: 'right', lineBreak: false });
    doc.fillColor('#64748b').fontSize(10).font('Helvetica')
      .text(quotation.quotationNumber, 320, 60, { width: 235, align: 'right', lineBreak: false });

    let y = 175;

    // ── META INFO ROW ─────────────────────────────────────────────────────────
    doc.rect(L, y, contentW, 22).fill('#f1f5f9').stroke('#e2e8f0');
    doc.fillColor('#475569').fontSize(9).font('Helvetica')
      .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-IN')}`, L + 10, y + 7, { lineBreak: false })
      .text(`Status: ${(quotation.status || 'pending').toUpperCase()}`, L + 160, y + 7, { lineBreak: false });
    if (quotation.validUntil) {
      doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-IN')}`, L + 310, y + 7, { lineBreak: false });
    }
    y += 30;

    // ── FROM / TO BOXES ───────────────────────────────────────────────────────
    const boxW = (contentW - 12) / 2;
    const boxH = 80;

    // FROM
    doc.rect(L, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(L, y, boxW, 20).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text('FROM', L + 10, y + 6, { lineBreak: false });
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L + 10, y + 26, { width: boxW - 20, lineBreak: false });
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
      .text('So104/1/50, Singapura Main Rd, Vidyaranyapura', L + 10, y + 41, { width: boxW - 20, lineBreak: false })
      .text('Bengaluru, Karnataka 560097', L + 10, y + 53, { width: boxW - 20, lineBreak: false })
      .text('GST: 29AANCP7155K1ZN', L + 10, y + 65, { width: boxW - 20, lineBreak: false })
      .text('hello@parnetsgroup.com  |  095909 26068', L + 10, y + 77, { width: boxW - 20, lineBreak: false });

    // TO
    const toX = L + boxW + 12;
    doc.rect(toX, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(toX, y, boxW, 20).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text('BILL TO', toX + 10, y + 6, { lineBreak: false });
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
      .text(quotation.client?.name || '—', toX + 10, y + 26, { width: boxW - 20, lineBreak: false });
    doc.fillColor('#475569').fontSize(9).font('Helvetica');
    let cy = y + 41;
    if (quotation.client?.company) { doc.text(quotation.client.company, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    if (quotation.client?.email)   { doc.text(quotation.client.email,   toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    if (quotation.client?.phone)   { doc.text(quotation.client.phone,   toX + 10, cy, { width: boxW - 20, lineBreak: false }); }
    y += boxH + 14;

    // ── PROJECT ROW ───────────────────────────────────────────────────────────
    doc.rect(L, y, contentW, 24).fill('#eff6ff').stroke('#bfdbfe');
    doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
      .text('PROJECT:', L + 10, y + 7, { lineBreak: false });
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
      .text(quotation.project?.name || '—', L + 80, y + 7, { width: contentW - 90, lineBreak: false });
    y += 32;

    // ── BUDGET TABLE ──────────────────────────────────────────────────────────
    const rH = 22;

    // Table header
    doc.rect(L, y, contentW, rH).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text('DESCRIPTION', L + 10, y + 6, { lineBreak: false })
      .text('AMOUNT (INR)', R - 10, y + 6, { align: 'right', width: 110, lineBreak: false });
    y += rH;

    const trow = (label, amount, shade = false) => {
      if (shade) doc.rect(L, y, contentW, rH).fill('#f8fafc');
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(label, L + 10, y + 6, { width: contentW - 140, lineBreak: false });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(`Rs. ${Number(amount).toLocaleString('en-IN')}`, R - 120, y + 6, { align: 'right', width: 110, lineBreak: false });
      doc.moveTo(L, y + rH).lineTo(R, y + rH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += rH;
    };

    trow('Development Budget', quotation.developmentBudget, false);
    if (quotation.services?.length) {
      quotation.services.forEach((s, i) => trow(s.serviceName, s.amount, i % 2 === 0));
    }

    // Totals separator
    doc.moveTo(L, y + 2).lineTo(R, y + 2).strokeColor('#94a3b8').lineWidth(1).stroke();
    y += 8;

    const srow = (label, amount, bold = false, bg = null) => {
      if (bg) doc.rect(L, y, contentW, rH).fill(bg);
      doc.fillColor(bg === '#1e3a8a' ? '#ffffff' : '#475569')
        .fontSize(bold ? 11 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, L + 10, y + 6, { lineBreak: false });
      doc.fillColor(bg === '#1e3a8a' ? '#ffffff' : '#475569')
        .fontSize(bold ? 11 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(`Rs. ${Number(amount).toLocaleString('en-IN')}`, R - 120, y + 6, { align: 'right', width: 110, lineBreak: false });
      y += rH;
    };

    srow('Subtotal', quotation.subtotal ?? 0);
    srow('CGST (9%)', quotation.cgst ?? 0, false, '#f8fafc');
    srow('SGST (9%)', quotation.sgst ?? 0);
    y += 4;
    doc.rect(L, y, contentW, 28).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
      .text('GRAND TOTAL (Incl. GST)', L + 10, y + 8, { lineBreak: false });
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
      .text(`Rs. ${Number(quotation.grandTotal).toLocaleString('en-IN')}`, R - 120, y + 8, { align: 'right', width: 110, lineBreak: false });
    y += 36;

    // ── NOTES ─────────────────────────────────────────────────────────────────
    if (quotation.notes) {
      doc.rect(L, y, contentW, 20).fill('#fef9c3');
      doc.fillColor('#854d0e').fontSize(10).font('Helvetica-Bold')
        .text('NOTES', L + 10, y + 5, { lineBreak: false });
      y += 20;
      const noteLines = quotation.notes.split('\n').filter(Boolean);
      noteLines.forEach(line => {
        doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
          .text(line, L + 10, y + 4, { width: contentW - 20, lineBreak: false });
        y += 16;
      });
      y += 6;
    }

    // ── PAYMENT TERMS ─────────────────────────────────────────────────────────
    if (quotation.paymentTerms) {
      doc.rect(L, y, contentW, 20).fill('#eff6ff');
      doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold')
        .text('PAYMENT TERMS', L + 10, y + 5, { lineBreak: false });
      y += 20;
      quotation.paymentTerms.split('\n').filter(Boolean).forEach((line, i) => {
        doc.rect(L, y, 16, 16).fill('#2563eb');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold')
          .text(`${i + 1}`, L + 5, y + 4, { lineBreak: false });
        doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
          .text(line, L + 22, y + 3, { width: contentW - 30, lineBreak: false });
        y += 20;
      });
      y += 6;
    }

    // ── SIGNATURE AREA ────────────────────────────────────────────────────────
    y += 10;
    doc.moveTo(L, y).lineTo(L + 160, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.moveTo(R - 160, y).lineTo(R, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Authorized Signature', L, y + 4, { width: 160, align: 'center', lineBreak: false })
      .text('Client Signature', R - 160, y + 4, { width: 160, align: 'center', lineBreak: false });

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const fY = pageH - 30;
    doc.rect(0, fY, pageW, 30).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L, fY + 6, { lineBreak: false });
    doc.fillColor('#bfdbfe').fontSize(8).font('Helvetica')
      .text('This is a computer-generated quotation and does not require a physical signature.',
        L, fY + 18, { align: 'center', width: contentW, lineBreak: false });

    doc.end();
  } catch (e) {
    console.error('PDF error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
});

export default router;
