#!/usr/bin/env node
/**
 * Test script for sending quotation email with PDF attachment
 * Usage: node crm-backend/scripts/test-quotation-email.mjs <quotation-id>
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Quotation from '../models/Quotation.js';
import emailService from '../services/emailService.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Generate Quotation PDF Buffer (same as in routes)
async function generateQuotationPDF(quotation) {
  return new Promise((resolve, reject) => {
    try {
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

      // Header
      doc.rect(0, 0, pageW, 140).fill('#ffffff');
      
      const logoPath = path.join(__dirname, '../../crm-frontent/public/logo.jpg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, L, 20, { fit: [120, 60] });
      }

      doc.fillColor('#1e3a8a').fontSize(18).font('Helvetica-Bold')
        .text('ParNets Software India Pvt Ltd', L, 88, { width: contentW, align: 'center', lineBreak: false });

      doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold')
        .text('QUOTATION', 320, 30, { width: 235, align: 'right', lineBreak: false });
      doc.fillColor('#64748b').fontSize(10).font('Helvetica')
        .text(quotation.quotationNumber, 320, 60, { width: 235, align: 'right', lineBreak: false });

      let y = 175;

      // Meta info
      doc.rect(L, y, contentW, 22).fill('#f1f5f9').stroke('#e2e8f0');
      doc.fillColor('#475569').fontSize(9).font('Helvetica')
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-IN')}`, L + 10, y + 7, { lineBreak: false });
      y += 30;

      // Client info
      const boxW = (contentW - 12) / 2;
      const boxH = 80;
      const toX = L + boxW + 12;
      
      doc.rect(toX, y, boxW, boxH).fill('#f8fafc').stroke('#e2e8f0');
      doc.rect(toX, y, boxW, 20).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('BILL TO', toX + 10, y + 6, { lineBreak: false });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
        .text(quotation.client?.name || '—', toX + 10, y + 26, { width: boxW - 20, lineBreak: false });
      
      y += boxH + 14;

      // Grand total
      doc.rect(L, y, contentW, 28).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('GRAND TOTAL (Incl. GST)', L + 10, y + 8, { lineBreak: false });
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text(`Rs. ${Number(quotation.grandTotal).toLocaleString('en-IN')}`, R - 120, y + 8, { align: 'right', width: 110, lineBreak: false });

      // Footer
      const fY = pageH - 30;
      doc.rect(0, fY, pageW, 30).fill('#1e3a8a');
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
        .text('ParNets Software India Pvt Ltd', L, fY + 6, { lineBreak: false });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function testQuotationEmail() {
  try {
    const quotationId = process.argv[2];
    
    if (!quotationId) {
      console.error('❌ Please provide quotation ID');
      console.log('Usage: node test-quotation-email.mjs <quotation-id>');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log(`\n📋 Fetching quotation ${quotationId}...`);
    const quotation = await Quotation.findById(quotationId)
      .populate({ path: 'project', select: 'name client', populate: { path: 'client', select: 'name email phone company address' } })
      .populate({ path: 'client', select: 'name email phone company address' })
      .lean();

    if (!quotation) {
      console.error('❌ Quotation not found');
      process.exit(1);
    }

    // Resolve client
    const client = (quotation.client && quotation.client.name) ? quotation.client
                 : (quotation.project?.client && quotation.project.client.name) ? quotation.project.client
                 : null;

    console.log('✅ Quotation found:', quotation.quotationNumber);
    console.log('   Client:', client?.name || 'N/A');
    console.log('   Email:', client?.email || 'N/A');
    console.log('   Grand Total:', quotation.grandTotal);

    if (!client?.email) {
      console.error('❌ Client has no email address');
      process.exit(1);
    }

    console.log('\n📄 Generating PDF...');
    const pdfBuffer = await generateQuotationPDF({ ...quotation, client });
    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    console.log('\n📧 Sending email...');
    const emailResult = await emailService.sendMail({
      to: client.email,
      subject: `Quotation ${quotation.quotationNumber} — Parnets Software India Pvt Ltd`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e3a8a;padding:24px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">Quotation ${quotation.quotationNumber}</h2>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0">Project: ${quotation.project?.name}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Dear ${client.name},</p>
          <p style="color:#64748b;font-size:14px">Please find attached the quotation for your project.</p>
          <p style="margin-top:24px">Regards,<br><strong>Parnets Software India Pvt Ltd</strong></p>
        </div>
      </div>`,
      attachments: [{
        filename: `Quotation-${quotation.quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    if (emailResult.success) {
      console.log('✅ Email sent successfully!');
      console.log('   To:', client.email);
      console.log('   Subject:', `Quotation ${quotation.quotationNumber}`);
      console.log('   Attachment:', `Quotation-${quotation.quotationNumber}.pdf`);
    } else {
      console.error('❌ Email failed:', emailResult.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testQuotationEmail();
