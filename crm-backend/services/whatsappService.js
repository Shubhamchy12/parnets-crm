/**
 * WhatsApp Service using Twilio API
 * Handles WhatsApp message sending for invoices and notifications
 */
class WhatsAppService {
  constructor() {
    this.isConfigured = false;
    this.accountSid = null;
    this.authToken = null;
    this.fromNumber = null;
  }

  /**
   * Initialize WhatsApp service with Twilio credentials
   */
  initialize() {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env;

    // Check if Twilio is properly configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || 
        TWILIO_ACCOUNT_SID === 'your-twilio-account-sid' ||
        TWILIO_AUTH_TOKEN === 'your-twilio-auth-token') {
      console.warn('⚠️  WARNING: Twilio WhatsApp not configured properly.');
      console.warn('   WhatsApp messaging will not work.');
      console.warn('   Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in .env file');
      console.warn('   Get credentials at: https://console.twilio.com/');
      this.isConfigured = false;
      return;
    }

    this.accountSid = TWILIO_ACCOUNT_SID;
    this.authToken = TWILIO_AUTH_TOKEN;
    this.fromNumber = TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    this.isConfigured = true;

    console.log('✅ WhatsApp service initialized successfully');
    console.log(`   Sending from: ${this.fromNumber}`);
  }

  /**
   * Check if WhatsApp service is configured and ready
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Format phone number for WhatsApp (Indian format)
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Get last 10 digits (Indian mobile number)
    const last10 = cleaned.slice(-10);
    
    // Return in WhatsApp format
    return `whatsapp:+91${last10}`;
  }

  /**
   * Send WhatsApp message via Twilio API
   */
  async sendMessage(to, message) {
    // Try to initialize if not configured
    if (!this.isConfigured) {
      this.initialize();
      
      // If still not configured after init, return error
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'WhatsApp service not configured. Please check Twilio settings in .env file.'
        };
      }
    }

    try {
      // Format the phone number
      const toNumber = this.formatPhoneNumber(to);
      if (!toNumber) {
        return {
          success: false,
          error: 'Invalid phone number provided'
        };
      }

      // Create authorization header
      const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      // Send message via Twilio API
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: this.fromNumber,
            To: toNumber,
            Body: message
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ WhatsApp send failed:', data.message || data.error_message);
        return {
          success: false,
          error: data.message || data.error_message || 'Failed to send WhatsApp message'
        };
      }

      console.log('✅ WhatsApp message sent successfully');
      console.log(`   To: ${toNumber}`);
      console.log(`   Message SID: ${data.sid}`);

      return {
        success: true,
        messageSid: data.sid,
        status: data.status,
        to: toNumber
      };
    } catch (error) {
      console.error('❌ WhatsApp send error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send invoice via WhatsApp
   */
  async sendInvoice(invoice, clientPhone, clientName) {
    // Format invoice items
    const itemLines = (invoice.items || [])
      .map(item => {
        const qty = item.qty || 1;
        const rate = item.rate || 0;
        const amount = qty * rate;
        return `• ${item.description}: ₹${amount.toLocaleString('en-IN')}`;
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

    // Build message
    let message = `*Invoice ${invoice.invoiceNumber}*\n`;
    
    if (invoice.installmentLabel) {
      message += `Installment: ${invoice.installmentLabel}\n`;
    }
    
    message += `\nDear ${clientName},\n\n`;
    message += `${itemLines}\n\n`;
    message += `*Total Amount: ₹${totalAmount.toLocaleString('en-IN')}*\n`;
    
    if (remainingAmount > 0) {
      message += `Remaining: ₹${remainingAmount.toLocaleString('en-IN')}\n`;
    }
    
    if (dueDate) {
      message += `Due Date: ${dueDate}\n`;
    }
    
    message += `\nThank you for your business!\n\n`;
    message += `Best regards,\n`;
    message += `Parnets Software India Pvt Ltd`;

    return await this.sendMessage(clientPhone, message);
  }

  /**
   * Force reinitialize the WhatsApp service (useful after env changes)
   */
  reinitialize() {
    console.log('🔄 Reinitializing WhatsApp service...');
    this.isConfigured = false;
    this.accountSid = null;
    this.authToken = null;
    this.fromNumber = null;
    this.initialize();
    return this.isConfigured;
  }
}

// Export singleton instance
export default new WhatsAppService();
