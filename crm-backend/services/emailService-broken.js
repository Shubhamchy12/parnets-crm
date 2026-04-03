import nodemailer from 'nodemailer';

/**
 * Professional Email Service using Gmail SMTP
 * Handles all email communications including OTP, invoices, and notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer transporter with Gmail SMTP
   */
  initializeTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME } = process.env;

    // Check if SMTP is properly configured
    if (!SMTP_USER || !SMTP_PASS || SMTP_USER === 'your-real-gmail@gmail.com' || SMTP_PASS === 'your-app-password-here') {
      console.warn('⚠️  SMTP not configured properly. Email service will not work.');
      console.warn('📧 Please configure SMTP_USER and SMTP_PASS in .env file');
      console.warn('🔑 Use Gmail App Password (not regular password)');
      console.warn('🔗 Generate at: https://myaccount.google.com/apppasswords');
      this.isConfigured = false;
      return;
    }

    // Additional validation
    if (SMTP_USER.length < 5 || SMTP_PASS.length < 8) {
      console.warn('⚠️  SMTP credentials appear invalid (too short)');
      this.isConfigured = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // For development
        }
      });

      this.fromName = SMTP_FROM_NAME || 'Parnets CRM';
      this.fromEmail = SMTP_USER;
      this.isConfigured = true;

      console.log('✅ Email service initialized successfully');
      console.log(`📧 Sending emails from: ${this.fromName} <${this.fromEmail}>`);

      // Verify connection
      this.verifyConnection();
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', error.message);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Check if email service is configured and ready
   */
  isReady() {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Force reinitialize the email service (useful after env changes)
   */
  reinitialize() {
    console.log('🔄 Reinitializing email service...');
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
    return this.isConfigured;
  }

  /**
   * Send email with error handling
   */
  async sendMail(mailOptions) {
    // Try to reinitialize if not configured
    if (!this.isConfigured || !this.transporter) {
      console.log('⚠️  Email service not configured, attempting to reinitialize...');
      this.initializeTransporter();
      
      // If still not configured after reinit, return error
      if (!this.isConfigured || !this.transporter) {
        console.error('❌ Email service not configured. Cannot send email.');
        console.error('   SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
        console.error('   SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
        return {
          success: false,
          error: 'Email service not configured. Please check SMTP settings.'
        };
      }
    }

    try {
      // Add default from if not specified
      if (!mailOptions.from) {
        mailOptions.from = `"${this.fromName}" <${this.fromEmail}>`;
      }

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully');
      console.log(`   To: ${mailOptions.to}`);
      console.log(`   Subject: ${mailOptions.subject}`);
      console.log(`   Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send OTP email for login
   */
  async sendOTPEmail(email, otp, userName = 'User') {
    const mailOptions = {
      to: email,
      subject: 'Your CRM Login OTP',
      html: this.getOTPEmailTemplate(otp, userName)
    };

    return await this.sendMail(mailOptions);
  }

  /**
   * Get OTP email template
   */
  getOTPEmailTemplate(otp, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CRM Login OTP</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔐 CRM System</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">One-Time Password for Login</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 20px;">Hello ${userName},</h2>
                    <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                      You have requested to login to the CRM System. Please use the following One-Time Password (OTP) to complete your login:
                    </p>
                    
                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center" style="background-color: #f8fafc; border: 2px dashed #2563eb; border-radius: 8px; padding: 30px;">
                          <div style="font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin-bottom: 10px;">${otp}</div>
                          <p style="margin: 0; color: #64748b; font-size: 14px;">This OTP is valid for 10 minutes only</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Notice -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px;">
                          <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: bold;">⚠️ Security Notice:</p>
                          <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                            <li>This OTP is for single use only</li>
                            <li>Do not share this OTP with anyone</li>
                            <li>If you didn't request this, contact your administrator immediately</li>
                            <li>Maximum 3 verification attempts allowed</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0 0; color: #475569; font-size: 14px;">
                      If you're having trouble, please contact your system administrator.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px; color: #64748b; font-size: 13px;">This is an automated message from CRM System</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Parnets Software India Pvt Ltd. All rights reserved.</p>
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

  /**
   * Send invoice email to client
   */
  async sendInvoiceEmail(clientEmail, invoice, clientName = 'Client') {
    const mailOptions = {
      to: clientEmail,
      subject: `Invoice ${invoice.invoiceNumber} – Parnets Software India Pvt Ltd`,
      html: this.getInvoiceEmailTemplate(invoice, clientName)
    };

    return await this.sendMail(mailOptions);
  }

  /**
   * Get invoice email template - Exact PDF Match with Mobile Responsive
   */
  getInvoiceEmailTemplate(invoice, clientName) {
    // Generate items HTML
    const itemsHtml = (invoice.items || []).map((item) => {
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

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(email, userName, tempPassword, role) {
    const mailOptions = {
      to: email,
      subject: 'Welcome to CRM System - Account Created',
      html: this.getWelcomeEmailTemplate(email, userName, tempPassword, role)
    };

    return await this.sendMail(mailOptions);
  }

  /**
   * Get welcome email template
   */ 
              padding: 15px !important; 
            }
            .header-section { 
              padding: 20px 15px 15px !important; 
            }
            .header-logo-box { 
              width: 100px !important; 
              height: 50px !important; 
              font-size: 20px !important;
            }
            .header-title { 
              font-size: 24px !important; 
              margin-bottom: 5px !important;
            }
            .invoice-number { 
              font-size: 16px !important; 
              margin-bottom: 10px !important;
            }
            .company-info { 
              font-size: 10px !important; 
              line-height: 1.4 !important;
            }
            .company-info div { 
              margin-bottom: 2px !important; 
            }
            .header-right { 
              margin-top: 15px !important; 
            }
            .table-responsive { 
              overflow-x: auto; 
              -webkit-overflow-scrolling: touch;
            }
            .items-table { 
              min-width: 500px !important; 
            }
            .amount-box { 
              padding: 12px !important; 
            }
            .amount-label { 
              font-size: 10px !important; 
            }
            .amount-value { 
              font-size: 18px !important; 
            }
            .items-table td, 
            .items-table th { 
              padding: 8px 4px !important; 
              font-size: 11px !important; 
            }
            .items-table .item-desc { 
              font-size: 11px !important; 
              line-height: 1.3 !important;
              word-break: break-word !important;
            }
            .total-row td { 
              font-size: 14px !important; 
              padding: 10px 4px !important;
            }
            .section-padding { 
              padding: 15px !important; 
            }
            .notes-box, 
            .payment-box { 
              padding: 12px !important; 
            }
            .footer-section { 
              padding: 20px 15px !important; 
            }
            /* Stack header on mobile */
            .header-table { 
              display: block !important; 
              width: 100% !important; 
            }
            .header-left, 
            .header-right { 
              display: block !important; 
              width: 100% !important; 
              text-align: left !important; 
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px 10px;">
          <tr>
            <td align="center">
              <table class="container" width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); max-width: 100%;">
                
                <!-- Header with Logo and Invoice Info -->
                <tr>
                  <td class="header-section" style="padding: 30px 30px 20px;">
                    <table class="header-table" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="header-left" style="vertical-align: top; width: 50%;">
                          <!-- Logo -->
                          <table cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
                            <tr>
                              <td class="header-logo-box" style="width: 120px; height: 60px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px; text-align: center; vertical-align: middle;">
                                <span style="color: white; font-size: 24px; font-weight: bold; line-height: 60px;">ParNets</span>
                              </td>
                            </tr>
                          </table>
                          <!-- Company Info -->
                          <table class="company-info" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #64748b; line-height: 1.6;">
                            <tr><td style="font-weight: 600; color: #1e293b; padding-bottom: 4px;">Parnets Software India Pvt Ltd</td></tr>
                            <tr><td style="padding-bottom: 2px;">So104/1/50, Singapura Main Rd,</td></tr>
                            <tr><td style="padding-bottom: 2px;">Vidyaranyapura, Bengaluru,</td></tr>
                            <tr><td style="padding-bottom: 8px;">Karnataka 560097</td></tr>
                            <tr><td style="font-weight: 500; color: #1e293b; padding-bottom: 2px;">📞 095909 26068</td></tr>
                            <tr><td style="color: #6366f1;">📧 hello@parnetsgroup.com</td></tr>
                          </table>
                        </td>
                        <td class="header-right" style="vertical-align: top; text-align: right; width: 50%;">
                          <h1 class="header-title" style="margin: 0 0 8px; color: #1e293b; font-size: 32px; font-weight: 700; line-height: 1.2;">INVOICE</h1>
                          <div class="invoice-number" style="font-size: 18px; font-weight: 600; color: #6366f1; margin-bottom: 15px;">${invoice.invoiceNumber}</div>
                          ${invoice.installmentLabel ? `
                            <table cellpadding="0" cellspacing="0" align="right" style="margin-bottom: 12px;">
                              <tr>
                                <td style="padding: 6px 12px; background-color: #dcfce7; color: #166534; border-radius: 6px; font-size: 13px; font-weight: 600;">
                                  ${invoice.installmentLabel}
                                </td>
                              </tr>
                            </table>
                          ` : ''}
                          <table cellpadding="0" cellspacing="0" align="right" style="font-size: 13px; color: #64748b; line-height: 1.8;">
                            <tr><td style="padding-bottom: 4px;"><strong style="color: #1e293b;">Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
                            ${invoice.dueDate ? `<tr><td><strong style="color: #1e293b;">Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>` : ''}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 30px;">
                    <div style="height: 2px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);"></div>
                  </td>
                </tr>

                <!-- Bill To Section -->
                <tr>
                  <td style="padding: 20px 30px;">
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">BILL TO:</div>
                    <div style="font-size: 15px; color: #1e293b;">
                      <div style="font-weight: 700; margin-bottom: 4px;">${clientName}</div>
                      ${invoice.clientPhone ? `<div style="color: #64748b; font-size: 13px;">� ${invoice.clientPhone}</div>` : ''}
                      ${invoice.projectName ? `<div style="color: #64748b; font-size: 13px; margin-top: 4px;">Project: ${invoice.projectName}</div>` : ''}
                    </div>
                  </td>
                </tr>

                <!-- Line Items Table -->
                <tr>
                  <td style="padding: 0 30px 20px;">
                    <div class="table-responsive" style="overflow-x: auto;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #f8fafc;">
                            <th style="padding: 12px; text-align: left; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0;">Description</th>
                            <th style="padding: 12px; text-align: center; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0; width: 60px;">Qty</th>
                            <th style="padding: 12px; text-align: right; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0; width: 100px;">Rate</th>
                            <th style="padding: 12px; text-align: right; color: #475569; font-size: 13px; font-weight: 600; border-bottom: 2px solid #e2e8f0; width: 120px;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                        <tfoot>
                          <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="padding: 10px 12px; text-align: right; color: #64748b; font-size: 14px; font-weight: 600; border-top: 1px solid #e2e8f0;">Subtotal</td>
                            <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-size: 14px; font-weight: 600; border-top: 1px solid #e2e8f0;">₹${Number(invoice.subtotal || 0).toLocaleString('en-IN')}</td>
                          </tr>
                          ${invoice.tax ? `
                          <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="padding: 10px 12px; text-align: right; color: #64748b; font-size: 14px; font-weight: 600;">GST (18%)</td>
                            <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-size: 14px; font-weight: 600;">₹${Number(invoice.tax || 0).toLocaleString('en-IN')}</td>
                          </tr>
                          ` : ''}
                          ${invoice.discount ? `
                          <tr style="background-color: #f8fafc;">
                            <td colspan="3" style="padding: 10px 12px; text-align: right; color: #64748b; font-size: 14px; font-weight: 600;">Discount</td>
                            <td style="padding: 10px 12px; text-align: right; color: #dc2626; font-size: 14px; font-weight: 600;">-₹${Number(invoice.discount || 0).toLocaleString('en-IN')}</td>
                          </tr>
                          ` : ''}
                          <tr style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
                            <td colspan="3" style="padding: 14px 12px; text-align: right; color: #ffffff; font-size: 16px; font-weight: 700;">TOTAL AMOUNT</td>
                            <td style="padding: 14px 12px; text-align: right; color: #ffffff; font-size: 18px; font-weight: 700;">₹${Number(invoice.total || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Payment Summary (if partial payment) -->
                ${invoice.remainingAmount && invoice.remainingAmount > 0 && invoice.remainingAmount < invoice.total ? `
                <tr>
                  <td style="padding: 0 30px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; overflow: hidden;">
                      <tr>
                        <td class="amount-box" style="padding: 20px; text-align: center;">
                          <div class="amount-label" style="font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 8px;">REMAINING AMOUNT TO PAY</div>
                          <div class="amount-value" style="font-size: 24px; color: #92400e; font-weight: 700;">₹${Number(invoice.remainingAmount).toLocaleString('en-IN')}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ` : ''}

                <!-- Notes -->
                ${invoice.notes ? `
                <tr>
                  <td style="padding: 0 30px 20px;">
                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 15px;">
                      <div style="font-size: 12px; font-weight: 600; color: #1e40af; margin-bottom: 6px;">📝 NOTES:</div>
                      <div style="font-size: 13px; color: #1e40af; line-height: 1.6;">${invoice.notes}</div>
                    </div>
                  </td>
                </tr>
                ` : ''}

                <!-- Payment Instructions -->
                <tr>
                  <td style="padding: 0 30px 20px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                      <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 10px;">💳 Payment Instructions:</div>
                      <div style="font-size: 12px; color: #64748b; line-height: 1.8;">
                        <div>• Bank Transfer: Contact us for bank details</div>
                        <div>• UPI: Available on request</div>
                        <div>• Please mention invoice number in payment reference</div>
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Thank You Message -->
                <tr>
                  <td style="padding: 0 30px 30px;">
                    <div style="font-size: 14px; color: #475569; line-height: 1.6;">
                      <p style="margin: 0 0 15px;">Thank you for your business!</p>
                      <p style="margin: 0; color: #1e293b;">
                        <strong>Best Regards,</strong><br>
                        <span style="color: #6366f1; font-weight: 600;">Parnets Software India Pvt Ltd</span>
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #1e293b; padding: 25px 30px; text-align: center;">
                    <div style="color: #94a3b8; font-size: 11px; line-height: 1.6;">
                      <div style="margin-bottom: 8px;">This is a computer-generated invoice and does not require a physical signature.</div>
                      <div>For any queries, please contact us at <span style="color: #60a5fa;">hello@parnetsgroup.com</span> or call <span style="color: #60a5fa;">095909 26068</span></div>
                      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155;">
                        © ${new Date().getFullYear()} Parnets Software India Pvt Ltd. All rights reserved.
                      </div>
                    </div>
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

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(email, userName, tempPassword, role) {
    const mailOptions = {
      to: email,
      subject: 'Welcome to CRM System - Account Created',
      html: this.getWelcomeEmailTemplate(email, userName, tempPassword, role)
    };

    return await this.sendMail(mailOptions);
  }

  /**
   * Get welcome email template
   */
  getWelcomeEmailTemplate(email, userName, tempPassword, role) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CRM System</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🎉 Welcome!</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your CRM account has been created</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 20px;">Hello ${userName},</h2>
                    <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                      Your CRM System account has been created by the administrator. Here are your login credentials:
                    </p>
                    
                    <!-- Credentials Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td style="background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 25px;">
                          <h3 style="margin: 0 0 15px; color: #166534; font-size: 16px;">Login Credentials:</h3>
                          <p style="margin: 0 0 10px; color: #1e293b; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                          <p style="margin: 0 0 10px; color: #1e293b; font-size: 14px;"><strong>Temporary Password:</strong> <span style="background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</span></p>
                          <p style="margin: 0; color: #1e293b; font-size: 14px;"><strong>Role:</strong> ${role.replace('_', ' ').toUpperCase()}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Security Instructions -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px;">
                          <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: bold;">🔒 Important Security Instructions:</p>
                          <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                            <li><strong>Change your password immediately</strong> after first login</li>
                            <li>Use a strong password with at least 8 characters</li>
                            <li>Include uppercase, lowercase, numbers, and special characters</li>
                            <li>Do not share your credentials with anyone</li>
                            <li>You will receive an OTP via email for each login</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Login Process -->
                    <h3 style="margin: 30px 0 15px; color: #1e293b; font-size: 16px;">Login Process:</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
                      <li>Go to the CRM login page</li>
                      <li>Enter your email and temporary password</li>
                      <li>Check your email for the OTP (valid for 10 minutes)</li>
                      <li>Enter the OTP to complete login</li>
                      <li>Change your password in your profile settings</li>
                    </ol>
                    
                    <p style="margin: 30px 0 0; color: #475569; font-size: 14px;">
                      If you have any questions or need assistance, please contact your system administrator.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px; color: #64748b; font-size: 13px;">This is an automated message from CRM System</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Parnets Software India Pvt Ltd. All rights reserved.</p>
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
}

// Export singleton instance
export default new EmailService();
