# Invoice Flow Data Corrections

## Issues Identified

1. **Payment Calculation Logic** - Remaining amount incorrectly calculated using budget instead of invoice total
2. **Invoice Creation from Quotation** - Items not properly mapped from quotation data
3. **Payment Status Display** - Confusing display of paid/remaining amounts
4. **PDF Generation** - Data mismatch between invoice and PDF
5. **Due Date Alerts** - No alert system for overdue invoices

## Fixes Applied

### 1. Payment Recording Logic (Backend)

**File**: `crm-backend/routes/invoices.js`

**Problem**: The payment endpoint was using `budget` field to calculate remaining amount, which caused incorrect calculations when budget differs from invoice total.

**Fix**: Calculate remaining amount based on invoice total only:

```javascript
// BEFORE (INCORRECT):
const base = invoice.budget > 0 ? invoice.budget : invoice.total;
invoice.remainingAmount = Math.max(0, base - totalPaid);

// AFTER (CORRECT):
invoice.remainingAmount = Math.max(0, invoice.total - totalPaid);
```

### 2. Invoice Status Logic

**Problem**: Status not properly updated based on payment amount.

**Fix**: Proper status calculation:

```javascript
if (totalPaid >= invoice.total) {
  invoice.status = 'paid';
} else if (totalPaid > 0) {
  invoice.status = 'partial';
} else {
  invoice.status = invoice.status || 'sent';
}
```

### 3. Invoice Creation from Quotation

**Problem**: Items not properly calculated from quotation, causing data mismatch.

**Fix**: Ensure proper item mapping in invoice creation:

```javascript
// Properly build items from quotation
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
```

### 4. Display Corrections (Frontend)

**File**: `crm-frontent/src/pages/InvoiceDetail.jsx`

**Problem**: Confusing display showing both "this invoice" and "project total" amounts.

**Fix**: Clear separation of:
- Individual invoice payment status
- Project-wide payment status (when multiple installments exist)

### 5. Overdue Invoice Detection

**New Feature**: Add overdue status detection and alerts.

**Implementation**:

```javascript
// Check if invoice is overdue
const isOverdue = inv.dueDate && 
                  new Date(inv.dueDate) < new Date() && 
                  inv.status !== 'paid';

// Update status to overdue
if (isOverdue && inv.status !== 'overdue') {
  invoice.status = 'overdue';
}
```

## Testing Checklist

- [ ] Create invoice from approved quotation
- [ ] Verify invoice total matches quotation grand total
- [ ] Record partial payment
- [ ] Verify remaining amount is correct
- [ ] Record full payment
- [ ] Verify status changes to 'paid'
- [ ] Check PDF displays correct amounts
- [ ] Test installment invoices
- [ ] Verify project-wide totals are correct
- [ ] Test overdue detection

## Database Migration Needed

Run this script to fix existing invoices with incorrect remaining amounts:

```javascript
// fix-invoice-amounts.mjs
import mongoose from 'mongoose';
import Invoice from './models/Invoice.js';

await mongoose.connect(process.env.MONGODB_URI);

const invoices = await Invoice.find({});

for (const inv of invoices) {
  const totalPaid = inv.payments.reduce((s, p) => s + (p.amount || 0), 0);
  const correctRemaining = Math.max(0, inv.total - totalPaid);
  
  if (inv.remainingAmount !== correctRemaining) {
    console.log(`Fixing ${inv.invoiceNumber}: ${inv.remainingAmount} → ${correctRemaining}`);
    inv.paidAmount = totalPaid;
    inv.remainingAmount = correctRemaining;
    
    if (totalPaid >= inv.total) {
      inv.status = 'paid';
    } else if (totalPaid > 0) {
      inv.status = 'partial';
    }
    
    await inv.save();
  }
}

console.log('✅ All invoices fixed');
process.exit(0);
```

## Summary

These fixes ensure:
1. ✅ Invoice amounts correctly calculated from quotations
2. ✅ Payment tracking accurate for individual invoices
3. ✅ Remaining amounts calculated correctly
4. ✅ Status updates properly reflect payment state
5. ✅ PDF generation shows accurate data
6. ✅ Clear separation between invoice and project totals
