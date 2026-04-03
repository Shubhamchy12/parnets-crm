import express from 'express';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { authenticate, authorize } from '../middleware/auth.js';
import { logActivity } from '../middleware/activity.js';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';
import Quotation from '../models/Quotation.js';
import Transaction from '../models/Transaction.js';
import emailService from '../services/emailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

async function resolveClient(clientId) {
  if (!clientId) return null;
  try {
    return await Client.findById(clientId).select('name email phone company address').lean();
  } catch { return null; }
}

/**
 * Generate PDF buffer for invoice
 * Returns a Promise that resolves to Buffer
 */
async function generateInvoicePDF(invoice, clientDetails, siblingInvoices = []) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, autoFirstPage: false });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.addPage({ size: 'A4', margin: 0 });

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const L = 40, R = pageW - 40;
    const contentW = R - L;

    // â"€â"€ HEADER BAND â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    doc.rect(0, 0, pageW, 140).fill('#ffffff');

    const logoPath = path.join(__dirname, '../../crm-frontent/public/logo.jpg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, L, 20, { fit: [120, 60] });
    }

    // Company name â€" 2 lines
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

    // INVOICE label â€" right col
    doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold')
      .text('INVOICE', 320, 30, { width: 235, align: 'right', lineBreak: false });
    doc.fillColor('#64748b').fontSize(10).font('Helvetica')
      .text(invoice.invoiceNumber, 320, 60, { width: 235, align: 'right', lineBreak: false });
    if (invoice.installmentLabel) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
        .text(invoice.installmentLabel, 320, 75, { width: 235, align: 'right', lineBreak: false });
    }

    let y = 175;

    // â"€â"€ META ROW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    doc.rect(L, y, contentW, 22).fill('#fff7ed').stroke('#fed7aa');
    doc.fillColor('#c2410c').fontSize(9).font('Helvetica')
      .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, L + 10, y + 7, { lineBreak: false });
    if (invoice.dueDate) {
      doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, L + 160, y + 7, { lineBreak: false });
    }
    doc.text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, L + 310, y + 7, { lineBreak: false });
    if (invoice.quotationNumber) {
      doc.text(`Ref: ${invoice.quotationNumber}`, L + 400, y + 7, { lineBreak: false });
    }
    y += 30;

    // â"€â"€ FROM / TO â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    const boxW = (contentW - 12) / 2;
    const boxH = 95;

    doc.rect(L, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(L, y, boxW, 20).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('FROM', L + 10, y + 6, { lineBreak: false });
    doc.fillColor('#1e293b').fontSize(9.5).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L + 10, y + 26, { width: boxW - 20, lineBreak: false });
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
      .text('So104/1/50, Singapura Main Rd, Vidyaranyapura', L + 10, y + 40, { width: boxW - 20, lineBreak: false })
      .text('Bengaluru, Karnataka 560097', L + 10, y + 52, { width: boxW - 20, lineBreak: false })
      .text('GST: 29AANCP7155K1ZN', L + 10, y + 64, { width: boxW - 20, lineBreak: false })
      .text('hello@parnetsgroup.com  |  095909 26068', L + 10, y + 76, { width: boxW - 20, lineBreak: false });

    const toX = L + boxW + 12;
    doc.rect(toX, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(toX, y, boxW, 20).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('BILL TO', toX + 10, y + 6, { lineBreak: false });
    const cName = clientDetails?.name || invoice.clientName || 'â€"';
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
      .text(cName, toX + 10, y + 26, { width: boxW - 20, lineBreak: false });
    doc.fillColor('#475569').fontSize(9).font('Helvetica');
    let cy = y + 40;
    if (clientDetails?.company) { doc.text(clientDetails.company, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    const addr = clientDetails?.address || invoice.clientAddress || '';
    if (addr) { doc.text(addr, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    const phone = clientDetails?.phone || invoice.clientPhone || '';
    if (phone) { doc.text(phone, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    if (clientDetails?.email) { doc.text(clientDetails.email, toX + 10, cy, { width: boxW - 20, lineBreak: false }); }
    y += boxH + 10;

    // â"€â"€ PROJECT / DESCRIPTION â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    const projectName = invoice.project?.name || invoice.projectName || '';
    if (projectName || invoice.description || invoice.installmentLabel) {
      doc.rect(L, y, contentW, 24).fill('#fff7ed').stroke('#fed7aa');
      let infoText = '';
      if (projectName) infoText += `Project: ${projectName}`;
      if (invoice.installmentLabel) infoText += `  |  ${invoice.installmentLabel}`;
      if (invoice.description) infoText += `  |  ${invoice.description}`;
      doc.fillColor('#c2410c').fontSize(9).font('Helvetica-Bold')
        .text(infoText, L + 10, y + 7, { width: contentW - 20, lineBreak: false });
      y += 32;
    }

    // LINE ITEMS TABLE
    const rH = 22;
    const colQtyX = L + 295, colQtyW = 45;
    const colRateX = L + 345, colRateW = 85;
    const colAmtX = L + 435, colAmtW = R - L - 445;

    doc.rect(L, y, contentW, rH).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text('DESCRIPTION', L + 10, y + 6, { width: 280, lineBreak: false })
      .text('QTY', colQtyX, y + 6, { width: colQtyW, align: 'center', lineBreak: false })
      .text('RATE', colRateX, y + 6, { width: colRateW, align: 'right', lineBreak: false })
      .text('AMOUNT', colAmtX, y + 6, { width: colAmtW, align: 'right', lineBreak: false });
    y += rH;

    (invoice.items || []).forEach((item, i) => {
      if (i % 2 === 0) doc.rect(L, y, contentW, rH).fill('#f8fafc');
      const qty = item.qty || item.quantity || 1;
      const amt = qty * (item.rate || 0);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(item.description || '-', L + 10, y + 6, { width: 280, lineBreak: false })
        .text(String(qty), colQtyX, y + 6, { width: colQtyW, align: 'center', lineBreak: false })
        .text(`Rs.${Number(item.rate || 0).toLocaleString('en-IN')}`, colRateX, y + 6, { width: colRateW, align: 'right', lineBreak: false })
        .text(`Rs.${Number(amt).toLocaleString('en-IN')}`, colAmtX, y + 6, { width: colAmtW, align: 'right', lineBreak: false });
      doc.moveTo(L, y + rH).lineTo(R, y + rH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += rH;
    });

    // â"€â"€ TOTALS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    doc.moveTo(L, y + 2).lineTo(R, y + 2).strokeColor('#94a3b8').lineWidth(1).stroke();
    y += 8;

    const srow = (label, amount, bold = false, bg = null) => {
      if (bg) doc.rect(L, y, contentW, rH).fill(bg);
      doc.fillColor(bg === '#f97316' ? '#ffffff' : '#475569')
        .fontSize(bold ? 11 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, L + 10, y + 6, { lineBreak: false })
        .text('Rs.' + Number(amount).toLocaleString('en-IN'), colAmtX, y + 6, { width: colAmtW, align: 'right', lineBreak: false });
      y += rH;
    };

    srow('Subtotal', invoice.subtotal || 0);
    if (invoice.tax) srow('GST', invoice.tax, false, '#f8fafc');
    if (invoice.discount) srow('Discount', -invoice.discount);
    y += 4;
    doc.rect(L, y, contentW, 28).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
      .text('INVOICE TOTAL', L + 10, y + 8, { lineBreak: false })
      .text('Rs.' + Number(invoice.total || 0).toLocaleString('en-IN'), colAmtX, y + 8, { width: colAmtW, align: 'right', lineBreak: false });

    // â"€â"€ PAYMENT SCHEDULE (if siblings) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    if (siblingInvoices.length > 0) {
      doc.rect(L, y, contentW, 20).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('PAYMENT SCHEDULE', L + 10, y + 5, { lineBreak: false });
      y += 20;

      doc.rect(L, y, contentW, 16).fill('#f0f4ff');
      doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
        .text('INSTALLMENT', L + 10, y + 4, { lineBreak: false })
        .text('AMOUNT', L + 260, y + 4, { width: 80, align: 'right', lineBreak: false })
        .text('STATUS', L + 350, y + 4, { width: 70, align: 'center', lineBreak: false })
        .text('PAID', colAmtX, y + 4, { width: colAmtW, align: 'right', lineBreak: false });
      y += 16;

      let grandPaid = 0;
      siblingInvoices.forEach((inv, i) => {
        const isCurrent = String(inv._id) === String(invoice._id);
        const instPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        grandPaid += instPaid;
        if (isCurrent) doc.rect(L, y, contentW, 16).fill('#fefce8');
        else if (i % 2 === 0) doc.rect(L, y, contentW, 16).fill('#f8fafc');
        const statusColor = inv.status === 'paid' ? '#f97316' : inv.status === 'partial' ? '#d97706' : '#64748b';
        doc.fillColor(isCurrent ? '#92400e' : '#1e293b').fontSize(8.5).font(isCurrent ? 'Helvetica-Bold' : 'Helvetica')
          .text(`${inv.installmentLabel || inv.invoiceNumber}${isCurrent ? ' â—€' : ''}`, L + 10, y + 3, { width: 240, lineBreak: false })
          .text(`Rs. ${Number(inv.total || 0).toLocaleString('en-IN')}`, L + 260, y + 3, { width: 80, align: 'right', lineBreak: false });
        doc.fillColor(statusColor).fontSize(8.5).font('Helvetica-Bold')
          .text((inv.status || 'draft').toUpperCase(), L + 350, y + 3, { width: 70, align: 'center', lineBreak: false });
        doc.fillColor('#f97316').fontSize(8.5).font('Helvetica')
          .text(`Rs. ${instPaid.toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
        doc.moveTo(L, y + 16).lineTo(R, y + 16).strokeColor('#e2e8f0').lineWidth(0.3).stroke();
        y += 16;
      });

      const grandTotal = siblingInvoices.reduce((s, x) => s + (x.total || 0), 0);
      const remaining = Math.max(0, grandTotal - grandPaid);
      doc.rect(L, y, contentW, 16).fill('#fff7ed');
      doc.fillColor('#c2410c').fontSize(8.5).font('Helvetica-Bold')
        .text('PROJECT TOTAL', L + 10, y + 3, { lineBreak: false })
        .text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, L + 260, y + 3, { width: 80, align: 'right', lineBreak: false })
        .text(`Rs. ${grandPaid.toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
      y += 16;
      doc.rect(L, y, contentW, 16).fill('#fef2f2');
      doc.fillColor('#dc2626').fontSize(8.5).font('Helvetica-Bold')
        .text('REMAINING BALANCE', L + 10, y + 3, { lineBreak: false })
        .text(`Rs. ${remaining.toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
      y += 20;
    }

    // â"€â"€ PAYMENT HISTORY â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    if ((invoice.payments || []).length > 0) {
      y += 6;
      doc.rect(L, y, contentW, 18).fill('#fff7ed');
      doc.fillColor('#c2410c').fontSize(9).font('Helvetica-Bold').text('PAYMENT HISTORY', L + 10, y + 4, { lineBreak: false });
      y += 18;
      invoice.payments.forEach((p, i) => {
        if (i % 2 === 0) doc.rect(L, y, contentW, 16).fill('#f8fafc');
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
          .text(p.date ? new Date(p.date).toLocaleDateString('en-IN') : 'â€"', L + 10, y + 3, { lineBreak: false })
          .text((p.method || '').replace('_', ' '), L + 120, y + 3, { lineBreak: false })
          .text(p.reference || 'â€"', L + 240, y + 3, { lineBreak: false });
        doc.fillColor('#f97316').fontSize(9).font('Helvetica-Bold')
          .text(`Rs. ${Number(p.amount || 0).toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
        y += 16;
      });
      y += 4;
    }

    // â"€â"€ NOTES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    if (invoice.notes) {
      doc.rect(L, y, contentW, 16).fill('#fef9c3');
      doc.fillColor('#854d0e').fontSize(9).font('Helvetica-Bold').text('NOTES', L + 10, y + 3, { lineBreak: false });
      y += 16;
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
        .text(invoice.notes, L + 10, y + 3, { width: contentW - 20, lineBreak: false });
      y += 18;
    }

    // â"€â"€ SIGNATURE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    y += 10;
    doc.moveTo(L, y).lineTo(L + 160, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.moveTo(R - 160, y).lineTo(R, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Authorized Signature', L, y + 4, { width: 160, align: 'center', lineBreak: false })
      .text('Client Signature', R - 160, y + 4, { width: 160, align: 'center', lineBreak: false });

    // â"€â"€ FOOTER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    const fY = pageH - 30;
    doc.rect(0, fY, pageW, 30).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L, fY + 6, { lineBreak: false });
    doc.fillColor('#fff7ed').fontSize(8).font('Helvetica')
      .text('This is a computer-generated invoice and does not require a physical signature.',
        L, fY + 18, { align: 'center', width: contentW, lineBreak: false });

    doc.end();
  });
}

// GET /api/invoices/approved-quotations
router.get('/approved-quotations', authenticate, async (req, res) => {
  try {
    console.log('📋 Fetching approved quotations...');
    
    const quotations = await Quotation.find({ status: 'approved' })
      .populate({ path: 'project', select: 'name client', populate: { path: 'client', select: 'name email phone company address' } })
      .populate({ path: 'client', select: 'name email phone company address' })
      .sort({ createdAt: -1 }).lean();

    console.log(`✅ Found ${quotations.length} approved quotation(s)`);
    
    if (quotations.length > 0) {
      console.log('📊 Sample quotation data:', JSON.stringify(quotations[0], null, 2));
    }

    const resolved = quotations.map(q => {
      // Resolve client - try multiple sources
      let client = null;
      if (q.client && typeof q.client === 'object' && q.client.name) {
        client = q.client;
      } else if (q.project?.client && typeof q.project.client === 'object' && q.project.client.name) {
        client = q.project.client;
      } else if (q.clientName) {
        client = { name: q.clientName };
      }

      // Resolve project - try multiple sources
      let project = null;
      if (q.project && typeof q.project === 'object' && q.project.name) {
        project = { _id: q.project._id, name: q.project.name };
      } else if (q.projectName) {
        project = { name: q.projectName };
      }

      console.log(`   - ${q.quotationNumber || 'NO-NUMBER'}: Client=${client?.name || 'N/A'}, Project=${project?.name || 'N/A'}, GrandTotal=${q.grandTotal || 0}`);

      return { 
        ...q, 
        client, 
        project,
        // Ensure these fields are always present
        quotationNumber: q.quotationNumber || 'N/A',
        clientName: client?.name || q.clientName || 'No Client',
        projectName: project?.name || q.projectName || 'No Project',
        grandTotal: q.grandTotal || 0,
        developmentBudget: q.developmentBudget || 0,
        services: q.services || [],
        subtotal: q.subtotal || 0,
        cgst: q.cgst || 0,
        sgst: q.sgst || 0,
        paymentTerms: q.paymentTerms || '',
        createdAt: q.createdAt
      };
    });

    res.json({ success: true, data: { quotations: resolved } });
  } catch (e) {
    console.error('❌ approved-quotations error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/invoices/by-quote/:quoteId â€” all invoices for a quotation
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

    // Check and update overdue status
    const now = new Date();
    for (const inv of invoices) {
      if (inv.dueDate && new Date(inv.dueDate) < now && inv.status !== 'paid' && inv.status !== 'overdue') {
        await Invoice.findByIdAndUpdate(inv._id, { status: 'overdue' });
        inv.status = 'overdue';
      }
    }

    res.json({ success: true, data: { invoices, pagination: { current: +page, pages: Math.ceil(total / limit), total } } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/invoices
router.post('/', authenticate, authorize('super_admin', 'admin', 'sub_admin', 'sales'),
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

      // Safe ObjectId conversion — avoid cast errors
      const safeId = (val) => {
        if (!val) return undefined;
        const s = String(val);
        return /^[a-f\d]{24}$/i.test(s) ? s : undefined;
      };

      // If fromQuote is provided, fetch quotation data dynamically
      let quotationData = null;
      let resolvedItems = items;
      let resolvedClientName = clientName || '';
      let resolvedClientAddress = clientAddress || '';
      let resolvedClientPhone = clientPhone || '';
      let resolvedProjectName = projectName || '';
      let resolvedQuotationNumber = quotationNumber || '';

      if (fromQuote && safeId(fromQuote)) {
        try {
          quotationData = await Quotation.findById(fromQuote)
            .populate('client', 'name email phone company address')
            .populate('project', 'name')
            .lean();

          if (quotationData) {
            // Build items from quotation dynamically
            resolvedItems = [];
            if (quotationData.developmentBudget > 0) {
              resolvedItems.push({
                description: 'Development Budget',
                qty: 1,
                rate: quotationData.developmentBudget,
              });
            }
            if (quotationData.services && quotationData.services.length > 0) {
              quotationData.services.forEach(s => {
                resolvedItems.push({
                  description: s.serviceName || 'Service',
                  qty: 1,
                  rate: Number(s.amount) || 0,
                });
              });
            }

            // Resolve client info from quotation
            if (quotationData.client) {
              resolvedClientName = quotationData.client.name || quotationData.clientName || '';
              resolvedClientPhone = quotationData.client.phone || '';
              const addr = quotationData.client.address;
              if (addr) {
                if (typeof addr === 'string') {
                  resolvedClientAddress = addr;
                } else if (typeof addr === 'object') {
                  resolvedClientAddress = [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
                    .filter(Boolean).join(', ');
                }
              }
            }

            // Resolve project name from quotation
            if (quotationData.project) {
              resolvedProjectName = quotationData.project.name || quotationData.projectName || '';
            }

            // Quotation number
            resolvedQuotationNumber = quotationData.quotationNumber || '';
          }
        } catch (err) {
          console.error('Error fetching quotation:', err);
        }
      }

      // Fallback: Flatten address if it's an object
      if (!resolvedClientAddress && clientAddress) {
        if (typeof clientAddress === 'string') {
          resolvedClientAddress = clientAddress;
        } else if (typeof clientAddress === 'object') {
          resolvedClientAddress = [clientAddress.street, clientAddress.city, clientAddress.state, clientAddress.zipCode, clientAddress.country]
            .filter(Boolean).join(', ');
        } else {
          resolvedClientAddress = String(clientAddress);
        }
      }
      
      // Resolve client name if not provided
      if (!resolvedClientName && client) {
        try {
          const c = await Client.findById(client).select('name').lean();
          resolvedClientName = c?.name || '';
        } catch (_) {}
      }

      const subtotal = resolvedItems.reduce((s, i) => s + ((i.qty || i.quantity || 1) * (i.rate || 0)), 0);
      
      // For installment invoices, use the provided total instead of calculating from items
      // because items represent the full quotation, but total is the installment amount
      let finalTotal = subtotal + Number(tax) - Number(discount);
      let finalSubtotal = subtotal;
      
      if (installmentNumber && req.body.total) {
        // This is an installment invoice - use the provided amounts
        finalTotal = Number(req.body.total);
        finalSubtotal = Number(req.body.subtotal || req.body.total);
        console.log(`📦 Installment ${installmentNumber}: Using provided total ${finalTotal} instead of calculated ${subtotal}`);
      }
      
      const totalBudget = Number(budget) || 0;
      const thisPaid = Number(paidAmount) || 0;
      const alreadyPaid = Number(totalPaidSoFar) || 0;
      const remainingAmount = Math.max(0, totalBudget - alreadyPaid - thisPaid);

      // Check for duplicate installment and return existing invoice details
      if (fromQuote && installmentNumber) {
        const existingInstallment = await Invoice.findOne({
          fromQuote: safeId(fromQuote),
          installmentNumber: installmentNumber
        })
        .populate('payments')
        .lean();
        
        if (existingInstallment) {
          const statusText = existingInstallment.status === 'paid' 
            ? 'PAID' 
            : existingInstallment.status === 'partial' 
            ? 'PARTIALLY PAID' 
            : 'PENDING';
          
          const paidAmount = existingInstallment.paidAmount || 0;
          const totalAmount = existingInstallment.total || 0;
          const remainingAmount = existingInstallment.remainingAmount || 0;
          
          // Get last payment date if exists
          let lastPaymentDate = null;
          if (existingInstallment.payments && existingInstallment.payments.length > 0) {
            const lastPayment = existingInstallment.payments[existingInstallment.payments.length - 1];
            lastPaymentDate = lastPayment.date;
          }
          
          return res.status(400).json({
            success: false,
            message: `Installment ${installmentNumber} already exists for this quotation.`,
            error: 'DUPLICATE_INSTALLMENT',
            existingInvoice: {
              invoiceNumber: existingInstallment.invoiceNumber,
              status: statusText,
              total: totalAmount,
              paidAmount: paidAmount,
              remainingAmount: remainingAmount,
              lastPaymentDate: lastPaymentDate,
              createdAt: existingInstallment.createdAt,
              dueDate: existingInstallment.dueDate
            }
          });
        }
      }

      const invoiceNumber = await Invoice.generateInvoiceNumber();

      const invoice = await Invoice.create({
        invoiceNumber,
        client: safeId(client),
        clientName: resolvedClientName,
        clientAddress: resolvedClientAddress,
        clientPhone: resolvedClientPhone,
        project: safeId(project),
        projectName: resolvedProjectName,
        fromQuote: safeId(fromQuote),
        quotationNumber: resolvedQuotationNumber,
        items: resolvedItems,
        subtotal: finalSubtotal,
        tax: Number(tax),
        discount: Number(discount),
        total: finalTotal,
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

      console.log(`✅ Invoice created: ${invoice.invoiceNumber}`, {
        installment: installmentNumber || 'N/A',
        subtotal: finalSubtotal,
        total: finalTotal,
        budget: totalBudget,
      });

      res.status(201).json({ success: true, message: 'Invoice created successfully', data: { invoice } });
    } catch (e) {
      console.error('Create invoice error:', e.message, e.stack);
      if (e.code === 11000) {
        return res.status(400).json({ success: false, message: 'Invoice number already exists. Please try again.' });
      }
      res.status(500).json({ success: false, message: e.message || 'Something went wrong' });
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
    
    const installmentId = req.body.installmentId;
    
    invoice.payments.push(payment);

    const totalPaid = invoice.payments.reduce((s, p) => s + (p.amount || 0), 0);
    invoice.paidAmount = totalPaid;
    
    // If installment plan exists, update installment status
    if (invoice.hasInstallmentPlan && installmentId) {
      const installment = invoice.installmentPlan.id(installmentId);
      if (installment) {
        installment.paidAmount = (installment.paidAmount || 0) + payment.amount;
        if (installment.paidAmount >= installment.amount) {
          installment.status = 'paid';
        } else if (installment.paidAmount > 0) {
          installment.status = 'partial';
        }
      }
    }
    
    // Calculate remaining amount based on THIS invoice's total only
    invoice.remainingAmount = Math.max(0, invoice.total - totalPaid);
    
    // Update status based on payment
    if (totalPaid >= invoice.total) {
      invoice.status = 'paid';
    } else if (totalPaid > 0) {
      invoice.status = 'partial';
    }
    
    // Check if overdue
    if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid') {
      invoice.status = 'overdue';
    }
    
    await invoice.save();
    
    console.log(`✅ Payment recorded: ${payment.amount} for ${invoice.invoiceNumber}`);
    console.log(`   Total: ${invoice.total}, Paid: ${totalPaid}, Remaining: ${invoice.remainingAmount}, Status: ${invoice.status}`);

    // Auto-create accounting income entry when payment recorded
    await Transaction.create({
      type: 'income',
      category: 'Invoice Payment',
      amount: payment.amount,
      description: `Payment for ${invoice.invoiceNumber}${invoice.clientName ? ' â€” ' + invoice.clientName : ''}`,
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

// POST /api/invoices/:id/installment-plan - Add/Update installment plan
router.post('/:id/installment-plan', authenticate, authorize('super_admin', 'admin', 'sales'),
  logActivity('Installment plan created', 'invoice', 'medium'),
  async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

      const { installments } = req.body;
      if (!Array.isArray(installments) || installments.length === 0) {
        return res.status(400).json({ success: false, message: 'Installments array is required' });
      }

      // Validate total matches invoice total
      const planTotal = installments.reduce((sum, inst) => sum + Number(inst.amount || 0), 0);
      if (Math.abs(planTotal - invoice.total) > 0.01) {
        return res.status(400).json({ 
          success: false, 
          message: `Installment total (${planTotal}) must equal invoice total (${invoice.total})` 
        });
      }

      invoice.installmentPlan = installments.map((inst, idx) => ({
        installmentNumber: idx + 1,
        label: inst.label || `Installment ${idx + 1}`,
        amount: Number(inst.amount),
        dueDate: new Date(inst.dueDate),
        description: inst.description || '',
        status: 'pending',
        paidAmount: 0,
      }));
      
      invoice.hasInstallmentPlan = true;
      await invoice.save();

      res.json({ success: true, message: 'Installment plan created', data: { invoice } });
    } catch (e) {
      console.error('Installment plan error:', e);
      res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
  }
);

// PUT /api/invoices/:id/installment-plan/:installmentId - Update specific installment
router.put('/:id/installment-plan/:installmentId', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const installment = invoice.installmentPlan.id(req.params.installmentId);
    if (!installment) return res.status(404).json({ success: false, message: 'Installment not found' });

    if (req.body.label) installment.label = req.body.label;
    if (req.body.amount) installment.amount = Number(req.body.amount);
    if (req.body.dueDate) installment.dueDate = new Date(req.body.dueDate);
    if (req.body.description !== undefined) installment.description = req.body.description;

    await invoice.save();
    res.json({ success: true, message: 'Installment updated', data: { invoice } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/invoices/:id/installment-plan - Remove installment plan
router.delete('/:id/installment-plan', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.installmentPlan = [];
    invoice.hasInstallmentPlan = false;
    await invoice.save();

    res.json({ success: true, message: 'Installment plan removed', data: { invoice } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/invoices/:id/send-email - Send invoice with PDF attachment
router.post('/:id/send-email', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    console.log(`📧 Sending invoice email for ID: ${req.params.id}`);
    
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email phone company address')
      .populate('project', 'name')
      .lean();
    
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const clientDetails = invoice.client || null;
    const clientEmail = clientDetails?.email;
    const clientName = clientDetails?.name || invoice.clientName || 'Client';
    
    if (!clientEmail) {
      return res.status(400).json({ success: false, message: 'Client has no email address' });
    }

    console.log(`📧 Sending to: ${clientEmail} (${clientName})`);

    // Fetch sibling invoices for payment schedule
    let siblingInvoices = [];
    if (invoice.fromQuote) {
      siblingInvoices = await Invoice.find({ fromQuote: invoice.fromQuote })
        .sort({ installmentNumber: 1, createdAt: 1 }).lean();
    }

    // Generate PDF buffer
    console.log('📄 Generating PDF...');
    const pdfBuffer = await generateInvoicePDF(invoice, clientDetails, siblingInvoices);
    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    // Send email with PDF attachment
    const emailResult = await emailService.sendMail({
      to: clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} — Parnets Software India Pvt Ltd`,
      html: emailService.getInvoiceEmailTemplate(invoice, clientName),
      attachments: [{
        filename: `Invoice-${invoice.invoiceNumber}.pdf`,
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

    // Update invoice status
    await Invoice.findByIdAndUpdate(invoice._id, { 
      status: 'sent', 
      sentAt: new Date(), 
      sentVia: 'email' 
    });

    console.log(`✅ Invoice email sent successfully to ${clientEmail}`);
    res.json({ success: true, message: `Invoice sent to ${clientEmail}` });
    
  } catch (e) {
    console.error('❌ Send invoice email error:', e);
    res.status(500).json({ success: false, message: e.message || 'Failed to send email' });
  }
});

// POST /api/invoices/:id/send-whatsapp
router.post('/:id/send-whatsapp', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  console.log('📱 Send WhatsApp request received for invoice:', req.params.id);
  
  try {
    // Find invoice
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get client details
    const clientDetails = invoice.client ? await resolveClient(invoice.client) : null;
    const clientPhone = clientDetails?.phone || invoice.clientPhone;
    const clientName = clientDetails?.name || invoice.clientName || 'Valued Customer';

    if (!clientPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client has no phone number' 
      });
    }

    console.log(`📱 Generating WhatsApp link for: ${clientName} (${clientPhone})`);

    // Format invoice items
    const itemLines = (invoice.items || [])
      .map(item => {
        const qty = item.qty || 1;
        const rate = item.rate || 0;
        const amount = qty * rate;
        return `- ${item.description}: Rs.${amount.toLocaleString('en-IN')}`;
      })
      .join('\n');

    // Format amounts
    const totalAmount = Number(invoice.totalAmount || invoice.total || 0);
    const remainingAmount = Number(invoice.remainingAmount || 0);

    // Format due date
    const dueDate = invoice.dueDate 
      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : '';

    // Build WhatsApp message
    const messageParts = [
      `*Invoice ${invoice.invoiceNumber}*`,
      invoice.installmentLabel ? `Installment: ${invoice.installmentLabel}` : '',
      '',
      `Dear ${clientName},`,
      '',
      itemLines,
      '',
      `*Total Amount: Rs.${totalAmount.toLocaleString('en-IN')}*`,
      remainingAmount > 0 ? `Remaining: Rs.${remainingAmount.toLocaleString('en-IN')}` : '',
      dueDate ? `Due Date: ${dueDate}` : '',
      '',
      'Thank you for your business!',
      '',
      'Best regards,',
      'Parnets Software India Pvt Ltd'
    ];

    const message = messageParts.filter(Boolean).join('\n').trim();

    // Format phone number for WhatsApp
    const digits = clientPhone.replace(/\D/g, '');
    const e164 = digits.length === 10 ? `91${digits}` : digits;
    const waUrl = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;

    // Update invoice status
    await Invoice.findByIdAndUpdate(invoice._id, { 
      status: 'sent', 
      sentAt: new Date(), 
      sentVia: 'whatsapp' 
    });

    console.log('✅ WhatsApp URL generated successfully');
    res.json({ 
      success: true, 
      message: 'WhatsApp link ready',
      data: { waUrl }
    });
  } catch (error) {
    console.error('❌ WhatsApp generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to generate WhatsApp link' 
    });
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

    let siblingInvoices = [];
    if (invoice.fromQuote) {
      siblingInvoices = await Invoice.find({ fromQuote: invoice.fromQuote })
        .sort({ installmentNumber: 1, createdAt: 1 }).lean();
    }

    const clientDetails = invoice.client || null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true, autoFirstPage: false });
    doc.pipe(res);
    doc.addPage({ size: 'A4', margin: 0 });

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const L = 40, R = pageW - 40;
    const contentW = R - L;

    // â”€â”€ HEADER BAND â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    doc.rect(0, 0, pageW, 140).fill('#ffffff');

    const logoPath = path.join(__dirname, '../../crm-frontent/public/logo.jpg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, L, 20, { fit: [120, 60] });
    }

    // Company name â€” 2 lines
    doc.fillColor('#1e3a8a').fontSize(18).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L, 88, { width: contentW, align: 'center', lineBreak: false });
    // Address details - centered
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text('So104/1/50, Singapura Main Rd,', L, 110, { width: contentW, align: 'center', lineBreak: false })
      .text('Singapura Village, Varadharaja Nagar,', L, 122, { width: contentW, align: 'center', lineBreak: false })
      .text('Vidyaranyapura, Bengaluru, Karnataka 560097', L, 134, { width: contentW, align: 'center', lineBreak: false });

    // Contact details - centered
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('GST: 29AANCP7155K1ZN', L, 150, { width: contentW, align: 'center', lineBreak: false });
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('Contact: 095909 26068', L, 162, { width: contentW / 2 - 10, align: 'right', lineBreak: false });
    doc.fillColor('#4f46e5').fontSize(9).font('Helvetica')
      .text('hello@parnetsgroup.com', L + contentW / 2 + 10, 162, { width: contentW / 2 - 10, align: 'left', lineBreak: false });

    // INVOICE label â€” right col
    doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold')
      .text('INVOICE', 320, 30, { width: 235, align: 'right', lineBreak: false });
    doc.fillColor('#64748b').fontSize(10).font('Helvetica')
      .text(invoice.invoiceNumber, 320, 60, { width: 235, align: 'right', lineBreak: false });
    if (invoice.installmentLabel) {
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
        .text(invoice.installmentLabel, 320, 75, { width: 235, align: 'right', lineBreak: false });
    }

    let y = 175;

    // â”€â”€ META ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    doc.rect(L, y, contentW, 22).fill('#fff7ed').stroke('#fed7aa');
    doc.fillColor('#c2410c').fontSize(9).font('Helvetica')
      .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, L + 10, y + 7, { lineBreak: false });
    if (invoice.dueDate) {
      doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, L + 160, y + 7, { lineBreak: false });
    }
    doc.text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, L + 310, y + 7, { lineBreak: false });
    if (invoice.quotationNumber) {
      doc.text(`Ref: ${invoice.quotationNumber}`, L + 400, y + 7, { lineBreak: false });
    }
    y += 30;

    // â”€â”€ FROM / TO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const boxW = (contentW - 12) / 2;
    const boxH = 95;

    doc.rect(L, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(L, y, boxW, 20).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('FROM', L + 10, y + 6, { lineBreak: false });
    doc.fillColor('#1e293b').fontSize(9.5).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L + 10, y + 26, { width: boxW - 20, lineBreak: false });
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica')
      .text('So104/1/50, Singapura Main Rd, Vidyaranyapura', L + 10, y + 40, { width: boxW - 20, lineBreak: false })
      .text('Bengaluru, Karnataka 560097', L + 10, y + 52, { width: boxW - 20, lineBreak: false })
      .text('GST: 29AANCP7155K1ZN', L + 10, y + 64, { width: boxW - 20, lineBreak: false })
      .text('hello@parnetsgroup.com  |  095909 26068', L + 10, y + 76, { width: boxW - 20, lineBreak: false });

    const toX = L + boxW + 12;
    doc.rect(toX, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
    doc.rect(toX, y, boxW, 20).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text('BILL TO', toX + 10, y + 6, { lineBreak: false });
    const cName = clientDetails?.name || invoice.clientName || 'â€”';
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
      .text(cName, toX + 10, y + 26, { width: boxW - 20, lineBreak: false });
    doc.fillColor('#475569').fontSize(9).font('Helvetica');
    let cy = y + 40;
    if (clientDetails?.company) { doc.text(clientDetails.company, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    const addr = clientDetails?.address || invoice.clientAddress || '';
    if (addr) { doc.text(addr, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    const phone = clientDetails?.phone || invoice.clientPhone || '';
    if (phone) { doc.text(phone, toX + 10, cy, { width: boxW - 20, lineBreak: false }); cy += 14; }
    if (clientDetails?.email) { doc.text(clientDetails.email, toX + 10, cy, { width: boxW - 20, lineBreak: false }); }
    y += boxH + 10;

    // â”€â”€ PROJECT / DESCRIPTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const projectName = invoice.project?.name || invoice.projectName || '';
    if (projectName || invoice.description || invoice.installmentLabel) {
      doc.rect(L, y, contentW, 24).fill('#fff7ed').stroke('#fed7aa');
      let infoText = '';
      if (projectName) infoText += `Project: ${projectName}`;
      if (invoice.installmentLabel) infoText += `  |  ${invoice.installmentLabel}`;
      if (invoice.description) infoText += `  |  ${invoice.description}`;
      doc.fillColor('#c2410c').fontSize(9).font('Helvetica-Bold')
        .text(infoText, L + 10, y + 7, { width: contentW - 20, lineBreak: false });
      y += 32;
    }

    // LINE ITEMS TABLE
    const rH = 22;
    const colQtyX = L + 295, colQtyW = 45;
    const colRateX = L + 345, colRateW = 85;
    const colAmtX = L + 435, colAmtW = R - L - 445;

    doc.rect(L, y, contentW, rH).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text('DESCRIPTION', L + 10, y + 6, { width: 280, lineBreak: false })
      .text('QTY', colQtyX, y + 6, { width: colQtyW, align: 'center', lineBreak: false })
      .text('RATE', colRateX, y + 6, { width: colRateW, align: 'right', lineBreak: false })
      .text('AMOUNT', colAmtX, y + 6, { width: colAmtW, align: 'right', lineBreak: false });
    y += rH;

    (invoice.items || []).forEach((item, i) => {
      if (i % 2 === 0) doc.rect(L, y, contentW, rH).fill('#f8fafc');
      const qty = item.qty || item.quantity || 1;
      const amt = qty * (item.rate || 0);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(item.description || '-', L + 10, y + 6, { width: 280, lineBreak: false })
        .text(String(qty), colQtyX, y + 6, { width: colQtyW, align: 'center', lineBreak: false })
        .text(`Rs.${Number(item.rate || 0).toLocaleString('en-IN')}`, colRateX, y + 6, { width: colRateW, align: 'right', lineBreak: false })
        .text(`Rs.${Number(amt).toLocaleString('en-IN')}`, colAmtX, y + 6, { width: colAmtW, align: 'right', lineBreak: false });
      doc.moveTo(L, y + rH).lineTo(R, y + rH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
      y += rH;
    });

    // â”€â”€ TOTALS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    doc.moveTo(L, y + 2).lineTo(R, y + 2).strokeColor('#94a3b8').lineWidth(1).stroke();
    y += 8;

    const srow = (label, amount, bold = false, bg = null) => {
      if (bg) doc.rect(L, y, contentW, rH).fill(bg);
      doc.fillColor(bg === '#f97316' ? '#ffffff' : '#475569')
        .fontSize(bold ? 11 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .text(label, L + 10, y + 6, { lineBreak: false })
        .text('Rs.' + Number(amount).toLocaleString('en-IN'), colAmtX, y + 6, { width: colAmtW, align: 'right', lineBreak: false });
      y += rH;
    };

    srow('Subtotal', invoice.subtotal || 0);
    if (invoice.tax) srow('GST', invoice.tax, false, '#f8fafc');
    if (invoice.discount) srow('Discount', -invoice.discount);
    y += 4;
    doc.rect(L, y, contentW, 28).fill('#f97316');
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
      .text('INVOICE TOTAL', L + 10, y + 8, { lineBreak: false })
      .text('Rs.' + Number(invoice.total || 0).toLocaleString('en-IN'), colAmtX, y + 8, { width: colAmtW, align: 'right', lineBreak: false });

    // â”€â”€ PAYMENT SCHEDULE (if siblings) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (siblingInvoices.length > 0) {
      doc.rect(L, y, contentW, 20).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('PAYMENT SCHEDULE', L + 10, y + 5, { lineBreak: false });
      y += 20;

      doc.rect(L, y, contentW, 16).fill('#f0f4ff');
      doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
        .text('INSTALLMENT', L + 10, y + 4, { lineBreak: false })
        .text('AMOUNT', L + 260, y + 4, { width: 80, align: 'right', lineBreak: false })
        .text('STATUS', L + 350, y + 4, { width: 70, align: 'center', lineBreak: false })
        .text('PAID', colAmtX, y + 4, { width: colAmtW, align: 'right', lineBreak: false });
      y += 16;

      let grandPaid = 0;
      siblingInvoices.forEach((inv, i) => {
        const isCurrent = String(inv._id) === String(invoice._id);
        const instPaid = (inv.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        grandPaid += instPaid;
        if (isCurrent) doc.rect(L, y, contentW, 16).fill('#fefce8');
        else if (i % 2 === 0) doc.rect(L, y, contentW, 16).fill('#f8fafc');
        const statusColor = inv.status === 'paid' ? '#f97316' : inv.status === 'partial' ? '#d97706' : '#64748b';
        doc.fillColor(isCurrent ? '#92400e' : '#1e293b').fontSize(8.5).font(isCurrent ? 'Helvetica-Bold' : 'Helvetica')
          .text(`${inv.installmentLabel || inv.invoiceNumber}${isCurrent ? ' â—€' : ''}`, L + 10, y + 3, { width: 240, lineBreak: false })
          .text(`Rs. ${Number(inv.total || 0).toLocaleString('en-IN')}`, L + 260, y + 3, { width: 80, align: 'right', lineBreak: false });
        doc.fillColor(statusColor).fontSize(8.5).font('Helvetica-Bold')
          .text((inv.status || 'draft').toUpperCase(), L + 350, y + 3, { width: 70, align: 'center', lineBreak: false });
        doc.fillColor('#f97316').fontSize(8.5).font('Helvetica')
          .text(`Rs. ${instPaid.toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
        doc.moveTo(L, y + 16).lineTo(R, y + 16).strokeColor('#e2e8f0').lineWidth(0.3).stroke();
        y += 16;
      });

      const grandTotal = siblingInvoices.reduce((s, x) => s + (x.total || 0), 0);
      const remaining = Math.max(0, grandTotal - grandPaid);
      doc.rect(L, y, contentW, 16).fill('#fff7ed');
      doc.fillColor('#c2410c').fontSize(8.5).font('Helvetica-Bold')
        .text('PROJECT TOTAL', L + 10, y + 3, { lineBreak: false })
        .text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, L + 260, y + 3, { width: 80, align: 'right', lineBreak: false })
        .text(`Rs. ${grandPaid.toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
      y += 16;
      doc.rect(L, y, contentW, 16).fill('#fef2f2');
      doc.fillColor('#dc2626').fontSize(8.5).font('Helvetica-Bold')
        .text('REMAINING BALANCE', L + 10, y + 3, { lineBreak: false })
        .text(`Rs. ${remaining.toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
      y += 20;
    }

    // â”€â”€ PAYMENT HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if ((invoice.payments || []).length > 0) {
      y += 6;
      doc.rect(L, y, contentW, 18).fill('#fff7ed');
      doc.fillColor('#c2410c').fontSize(9).font('Helvetica-Bold').text('PAYMENT HISTORY', L + 10, y + 4, { lineBreak: false });
      y += 18;
      invoice.payments.forEach((p, i) => {
        if (i % 2 === 0) doc.rect(L, y, contentW, 16).fill('#f8fafc');
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
          .text(p.date ? new Date(p.date).toLocaleDateString('en-IN') : 'â€”', L + 10, y + 3, { lineBreak: false })
          .text((p.method || '').replace('_', ' '), L + 120, y + 3, { lineBreak: false })
          .text(p.reference || 'â€”', L + 240, y + 3, { lineBreak: false });
        doc.fillColor('#f97316').fontSize(9).font('Helvetica-Bold')
          .text(`Rs. ${Number(p.amount || 0).toLocaleString('en-IN')}`, colAmtX, y + 3, { width: colAmtW, align: 'right', lineBreak: false });
        y += 16;
      });
      y += 4;
    }

    // â”€â”€ NOTES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (invoice.notes) {
      doc.rect(L, y, contentW, 16).fill('#fef9c3');
      doc.fillColor('#854d0e').fontSize(9).font('Helvetica-Bold').text('NOTES', L + 10, y + 3, { lineBreak: false });
      y += 16;
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
        .text(invoice.notes, L + 10, y + 3, { width: contentW - 20, lineBreak: false });
      y += 18;
    }

    // â”€â”€ SIGNATURE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    y += 10;
    doc.moveTo(L, y).lineTo(L + 160, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.moveTo(R - 160, y).lineTo(R, y).strokeColor('#94a3b8').lineWidth(0.8).stroke();
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Authorized Signature', L, y + 4, { width: 160, align: 'center', lineBreak: false })
      .text('Client Signature', R - 160, y + 4, { width: 160, align: 'center', lineBreak: false });

    // â”€â”€ FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fY = pageH - 30;
    doc.rect(0, fY, pageW, 30).fill('#1e3a8a');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
      .text('ParNets Software India Pvt Ltd', L, fY + 6, { lineBreak: false });
    doc.fillColor('#fff7ed').fontSize(8).font('Helvetica')
      .text('This is a computer-generated invoice and does not require a physical signature.',
        L, fY + 18, { align: 'center', width: contentW, lineBreak: false });

    doc.end();
  } catch (e) {
    console.error('PDF error:', e);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'PDF generation failed' });
  }
});

export default router;



