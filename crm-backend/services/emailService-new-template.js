/**
 * NEW INVOICE EMAIL TEMPLATE - Exact PDF Match
 * Mobile Responsive & No Text Overlap
 */

function getInvoiceEmailTemplateNew(invoice, clientName) {
  // Generate items HTML
  const itemsHtml = (invoice.items || []).map((item, index) => {
    const qty = item.qty || item.quantity || 1;
    const rate = item.rate || 0;
    const amount = qty * rate;
    
    return `
      <tr>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; line-height: 1.4;">${item.description || '-'}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151; font-size: 14px;">${qty}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-size: 14px; white-space: nowrap;">₹${rate.toLocaleString('en-IN')}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-size: 14px; font-weight: 600; white-space: nowrap;">₹${amount.toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    /* Reset */
    body, table, td, p, a { 
      -webkit-text-size-adjust: 100%; 
      -ms-text-size-adjust: 100%; 
    }
    table, td { 
      mso-table-lspace: 0pt; 
      mso-table-rspace: 0pt; 
    }
    img { 
      border: 0; 
      height: auto; 
      line-height: 100%; 
      outline: none; 
      text-decoration: none; 
    }
    
    /* Mobile Responsive */
    @media only screen and (max-width: 600px) {
      .email-container { 
        width: 100% !important; 
        padding: 0 !important; 
      }
      .content-padding { 
        padding: 15px !important; 
      }
      .header-section { 
        padding: 20px 15px !important; 
      }
      .logo-cell { 
        display: block !important; 
        width: 100% !important; 
        text-align: center !important; 
        margin-bottom: 15px !important; 
      }
      .invoice-info-cell { 
        display: block !important; 
        width: 100% !important; 
        text-align: center !important; 
      }
      .logo-box { 
        width: 100px !important; 
        height: 50px !important; 
        font-size: 18px !important; 
        margin: 0 auto !important; 
      }
      .company-name { 
        font-size: 14px !important; 
      }
      .company-address { 
        font-size: 10px !important; 
        line-height: 1.4 !important; 
      }
      .invoice-title { 
        font-size: 24px !important; 
      }
      .invoice-number { 
        font-size: 16px !important; 
      }
      .table-scroll { 
        overflow-x: auto !important; 
        -webkit-overflow-scrolling: touch !important; 
      }
      .items-table { 
        min-width: 500px !important; 
      }
      .items-table td, 
      .items-table th { 
        padding: 8px 4px !important; 
        font-size: 11px !important; 
      }
      .total-row td { 
        font-size: 14px !important; 
        padding: 12px 4px !important; 
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  
  <!-- Main Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td style="padding: 20px 10px;">
        
        <!-- Email Container -->
        <table role="presentation" class="email-container" cellspacing="0" cellpadding="0" border="0" width="700" style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 100%;">
          
          <!-- Header Section -->
          <tr>
            <td class="header-section" style="padding: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <!-- Logo & Company Info -->
                  <td class="logo-cell" style="vertical-align: top; width: 50%;">
                    <!-- Logo -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 15px;">
                      <tr>
                        <td class="logo-box" style="width: 120px; height: 60px; background: linear-gradient(135deg, #1e3a8a 0%, #f97316 100%); border-radius: 8px; text-align: center; vertical-align: middle;">
                          <span style="color: #ffffff; font-size: 22px; font-weight: bold; line-height: 60px;">ParNets</span>
                        </td>
                      </tr>
                    </table>
                    <!-- Company Details -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr><td class="company-name" style="font-size: 15px; font-weight: 700; color: #111827; padding-bottom: 6px;">ParNets Software India Pvt Ltd</td></tr>
                      <tr><td class="company-address" style="font-size: 11px; color: #6b7280; line-height: 1.5; padding-bottom: 2px;">So104/1/50, Singapura Main Rd,</td></tr>
                      <tr><td class="company-address" style="font-size: 11px; color: #6b7280; line-height: 1.5; padding-bottom: 2px;">Singapura Village, Varadharaja Nagar,</td></tr>
                      <tr><td class="company-address" style="font-size: 11px; color: #6b7280; line-height: 1.5; padding-bottom: 2px;">Vidyaranyapura, Bengaluru,</td></tr>
                      <tr><td class="company-address" style="font-size: 11px; color: #6b7280; line-height: 1.5; padding-bottom: 8px;">Karnataka 560097</td></tr>
                      <tr><td class="company-address" style="font-size: 11px; color: #111827; font-weight: 600; padding-bottom: 2px;">Contact: 095909 26068</td></tr>
                      <tr><td class="company-address" style="font-size: 11px; color: #f97316; font-weight: 500;">hello@parnetsgroup.com</td></tr>
                    </table>
                  </td>
                  
                  <!-- Invoice Info -->
                  <td class="invoice-info-cell" style="vertical-align: top; text-align: right; width: 50%;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="right" width="100%">
                      <tr><td class="invoice-title" style="font-size: 32px; font-weight: 700; color: #f97316; padding-bottom: 8px; text-align: right;">INVOICE</td></tr>
                      <tr><td class="invoice-number" style="font-size: 18px; font-weight: 600; color: #1e3a8a; padding-bottom: 12px; text-align: right;">${invoice.invoiceNumber}</td></tr>
                      ${invoice.installmentLabel ? `
                      <tr>
                        <td style="text-align: right; padding-bottom: 12px;">
                          <span style="display: inline-block; padding: 6px 12px; background-color: #dcfce7; color: #166534; border-radius: 6px; font-size: 12px; font-weight: 600;">${invoice.installmentLabel}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr><td style="font-size: 12px; color: #6b7280; padding-bottom: 4px; text-align: right;"><strong style="color: #111827;">Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                      ${invoice.dueDate ? `<tr><td style="font-size: 12px; color: #6b7280; text-align: right;"><strong style="color: #111827;">Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 30px;">
              <div style="height: 2px; background: linear-gradient(90deg, #1e3a8a 0%, #f97316 100%);"></div>
            </td>
          </tr>
          
          <!-- Bill To Section -->
          <tr>
            <td class="content-padding" style="padding: 20px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr><td style="font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 8px;">BILL TO:</td></tr>
                <tr><td style="font-size: 16px; color: #111827; font-weight: 700; padding-bottom: 6px;">${clientName}</td></tr>
                ${invoice.clientPhone ? `<tr><td style="font-size: 13px; color: #6b7280; padding-bottom: 4px;">📞 ${invoice.clientPhone}</td></tr>` : ''}
                ${invoice.clientEmail ? `<tr><td style="font-size: 13px; color: #6b7280; padding-bottom: 4px;">📧 ${invoice.clientEmail}</td></tr>` : ''}
                ${invoice.projectName ? `<tr><td style="font-size: 13px; color: #6b7280; padding-top: 6px; font-weight: 500;">Project: ${invoice.projectName}</td></tr>` : ''}
              </table>
            </td>
          </tr>
          
          <!-- Items Table -->
          <tr>
            <td class="content-padding" style="padding: 0 30px 20px;">
              <div class="table-scroll" style="overflow-x: auto;">
                <table role="presentation" class="items-table" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; min-width: 100%;">
                  <thead>
                    <tr style="background-color: #f9fafb;">
                      <th style="padding: 12px 8px; text-align: left; color: #374151; font-size: 12px; font-weight: 700; border-bottom: 2px solid #d1d5db; text-transform: uppercase; letter-spacing: 0.5px;">DESCRIPTION</th>
                      <th style="padding: 12px 8px; text-align: center; color: #374151; font-size: 12px; font-weight: 700; border-bottom: 2px solid #d1d5db; width: 60px; text-transform: uppercase; letter-spacing: 0.5px;">QTY</th>
                      <th style="padding: 12px 8px; text-align: right; color: #374151; font-size: 12px; font-weight: 700; border-bottom: 2px solid #d1d5db; width: 100px; text-transform: uppercase; letter-spacing: 0.5px;">RATE</th>
                      <th style="padding: 12px 8px; text-align: right; color: #374151; font-size: 12px; font-weight: 700; border-bottom: 2px solid #d1d5db; width: 120px; text-transform: uppercase; letter-spacing: 0.5px;">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f9fafb;">
                      <td colspan="3" style="padding: 12px 8px; text-align: right; color: #6b7280; font-size: 14px; font-weight: 600; border-top: 2px solid #d1d5db;">Subtotal</td>
                      <td style="padding: 12px 8px; text-align: right; color: #111827; font-size: 14px; font-weight: 700; border-top: 2px solid #d1d5db; white-space: nowrap;">₹${Number(invoice.subtotal || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    ${invoice.tax ? `
                    <tr style="background-color: #f9fafb;">
                      <td colspan="3" style="padding: 10px 8px; text-align: right; color: #6b7280; font-size: 14px; font-weight: 600;">GST (18%)</td>
                      <td style="padding: 10px 8px; text-align: right; color: #111827; font-size: 14px; font-weight: 700; white-space: nowrap;">₹${Number(invoice.tax || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    ` : ''}
                    ${invoice.discount ? `
                    <tr style="background-color: #f9fafb;">
                      <td colspan="3" style="padding: 10px 8px; text-align: right; color: #6b7280; font-size: 14px; font-weight: 600;">Discount</td>
                      <td style="padding: 10px 8px; text-align: right; color: #dc2626; font-size: 14px; font-weight: 700; white-space: nowrap;">-₹${Number(invoice.discount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                    ` : ''}
                    <tr class="total-row" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                      <td colspan="3" style="padding: 16px 8px; text-align: right; color: #ffffff; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL AMOUNT</td>
                      <td style="padding: 16px 8px; text-align: right; color: #ffffff; font-size: 20px; font-weight: 700; white-space: nowrap;">₹${Number(invoice.total || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Remaining Amount (if partial) -->
          ${invoice.remainingAmount && invoice.remainingAmount > 0 && invoice.remainingAmount < invoice.total ? `
          <tr>
            <td class="content-padding" style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 11px; color: #92400e; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">REMAINING AMOUNT TO PAY</div>
                    <div style="font-size: 24px; color: #92400e; font-weight: 700;">₹${Number(invoice.remainingAmount).toLocaleString('en-IN')}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Notes -->
          ${invoice.notes ? `
          <tr>
            <td class="content-padding" style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px;">
                    <div style="font-size: 11px; font-weight: 700; color: #1e40af; margin-bottom: 6px; text-transform: uppercase;">📝 NOTES:</div>
                    <div style="font-size: 13px; color: #1e40af; line-height: 1.6; word-wrap: break-word;">${invoice.notes}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- Payment Instructions -->
          <tr>
            <td class="content-padding" style="padding: 0 30px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 10px;">💳 Payment Instructions:</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr><td style="font-size: 12px; color: #6b7280; padding-bottom: 4px;">• Bank Transfer: Contact us for bank details</td></tr>
                      <tr><td style="font-size: 12px; color: #6b7280; padding-bottom: 4px;">• UPI: Available on request</td></tr>
                      <tr><td style="font-size: 12px; color: #6b7280;">• Please mention invoice number in payment reference</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Thank You -->
          <tr>
            <td class="content-padding" style="padding: 0 30px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr><td style="font-size: 14px; color: #6b7280; padding-bottom: 12px;">Thank you for your business!</td></tr>
                <tr><td style="font-size: 14px; color: #111827; font-weight: 600;">Best Regards,</td></tr>
                <tr><td style="font-size: 14px; color: #f97316; font-weight: 700;">ParNets Software India Pvt Ltd</td></tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #111827; padding: 25px 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr><td style="color: #9ca3af; font-size: 11px; padding-bottom: 8px;">This is a computer-generated invoice and does not require a physical signature.</td></tr>
                <tr><td style="color: #9ca3af; font-size: 11px; padding-bottom: 12px;">For any queries, please contact us at <span style="color: #60a5fa;">hello@parnetsgroup.com</span> or call <span style="color: #60a5fa;">095909 26068</span></td></tr>
                <tr><td style="color: #6b7280; font-size: 10px; padding-top: 12px; border-top: 1px solid #374151;">© ${new Date().getFullYear()} ParNets Software India Pvt Ltd. All rights reserved.</td></tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;
}

module.exports = { getInvoiceEmailTemplateNew };
