import nodemailer from 'nodemailer';

/**
 * Professional Email Service using Gmail SMTP
 * Handles all email communications including OTP, invoices, and notifications
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    // Don't initialize in constructor - let it happen on first use
  }

  /**
   * Initialize nodemailer transporter with Gmail SMTP
   */
  initializeTransporter() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME } = process.env;

    // Check if SMTP is properly configured
    if (!SMTP_USER || !SMTP_PASS) {
      console.warn('WARNING: SMTP not configured properly. Email service will not work.');
      console.warn('Please configure SMTP_USER and SMTP_PASS in .env file');
      console.warn('Use Gmail App Password (not regular password)');
      console.warn('Generate at: https://myaccount.google.com/apppasswords');
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

      console.log('Email service initialized successfully');
      console.log(`Sending emails from: ${this.fromName} <${this.fromEmail}>`);

      // Verify connection
      this.verifyConnection();
    } catch (error) {
      console.error('Failed to initialize email service:', error.message);
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
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP connection verification failed:', error.message);
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
    console.log('Reinitializing email service...');
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
    return this.isConfigured;
  }

  /**
   * Send email with error handling
   */
  async sendMail(mailOptions) {
    // Try to initialize if not configured
    if (!this.isConfigured || !this.transporter) {
      console.log('Email service not configured, attempting to initialize...');
      this.initializeTransporter();
      
      // If still not configured after init, return error
      if (!this.isConfigured || !this.transporter) {
        console.error('Email service not configured. Cannot send email.');
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
      
      console.log('Email sent successfully');
      console.log(`   To: ${mailOptions.to}`);
      console.log(`   Subject: ${mailOptions.subject}`);
      console.log(`   Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Failed to send email:', error.message);
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
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">CRM System</h1>
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
                          <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: bold;">Security Notice:</p>
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
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Parnets Software India Pvt Ltd. All rights reserved.</p>
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
      html: `<html><body><h1>Welcome ${userName}!</h1><p>Your temporary password is: ${tempPassword}</p><p>Role: ${role}</p></body></html>`
    };

    return await this.sendMail(mailOptions);
  }

  /**
   * Get invoice email template
   */
  getInvoiceEmailTemplate(invoice, clientName) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount || 0);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${invoice.invoiceNumber}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #f97316 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Parnets Software India Pvt Ltd</h1>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Invoice Notification</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 20px;">Dear ${clientName},</h2>
                    <p style="margin: 0 0 20px; color: #475569; font-size: 16px; line-height: 1.6;">
                      Thank you for your business. Please find attached your invoice for the services provided.
                    </p>
                    
                    <!-- Invoice Details Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                      <tr>
                        <td style="background-color: #f8fafc; padding: 20px; border-bottom: 1px solid #e2e8f0;">
                          <h3 style="margin: 0; color: #1e293b; font-size: 18px;">Invoice Details</h3>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" cellpadding="8" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 14px; width: 40%;">Invoice Number:</td>
                              <td style="color: #1e293b; font-size: 14px; font-weight: bold;">${invoice.invoiceNumber}</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-size: 14px;">Invoice Date:</td>
                              <td style="color: #1e293b; font-size: 14px;">${formatDate(invoice.invoiceDate)}</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-size: 14px;">Due Date:</td>
                              <td style="color: #1e293b; font-size: 14px;">${formatDate(invoice.dueDate)}</td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0;">Total Amount:</td>
                              <td style="color: #2563eb; font-size: 18px; font-weight: bold; padding-top: 10px; border-top: 1px solid #e2e8f0;">${formatCurrency(invoice.totalAmount)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Payment Instructions -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 20px;">
                          <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px; font-weight: bold;">Payment Instructions:</p>
                          <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.8;">
                            Please review the attached invoice and process the payment by the due date. If you have any questions or concerns, feel free to contact us.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0 0; color: #475569; font-size: 14px;">
                      Thank you for choosing Parnets Software India Pvt Ltd.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px; color: #64748b; font-size: 13px;">This is an automated message from Parnets CRM System</p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Parnets Software India Pvt Ltd. All rights reserved.</p>
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
