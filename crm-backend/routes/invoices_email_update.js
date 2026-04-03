// POST /api/invoices/:id/send-email
router.post('/:id/send-email', authenticate, authorize('super_admin', 'admin', 'sales'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('client', 'name email phone company address')
      .lean();
    
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get client email
    const clientDetails = invoice.client || null;
    const clientEmail = clientDetails?.email;
    const clientName = clientDetails?.name || invoice.clientName || 'Client';
    
    if (!clientEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client has no email address. Please add an email to the client profile.' 
      });
    }

    // Send invoice email using email service
    const result = await emailService.sendInvoiceEmail(clientEmail, invoice, clientName);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: result.error || 'Failed to send email' 
      });
    }

    // Update invoice status
    await Invoice.findByIdAndUpdate(invoice._id, { 
      status: 'sent', 
      sentAt: new Date(), 
      sentVia: 'email' 
    });

    res.json({ 
      success: true, 
      message: `Invoice sent successfully to ${clientEmail}`,
      messageId: result.messageId
    });
  } catch (e) {
    console.error('Send invoice email error:', e);
    res.status(500).json({ 
      success: false, 
      message: e.message || 'Failed to send email' 
    });
  }
});
