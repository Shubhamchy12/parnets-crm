# Duplicate Installment Alert Examples

## Overview
When user tries to create an installment that already exists, the system shows detailed alerts with payment status and dates.

---

## Alert Examples

### Example 1: Fully Paid Installment
```
⚠️ 1st Installment: Already exists (Invoice #INV-1001)
✅ Status: PAID on 15 Jan 2024
💰 Amount: ₹25,000
```

**Scenario**: User tries to create 1st installment again, but it was already paid on 15 Jan 2024.

---

### Example 2: Partially Paid Installment
```
⚠️ 2nd Installment: Already exists (Invoice #INV-1002)
⚠️ Status: PARTIALLY PAID
💰 Paid: ₹15,000 / ₹30,000
📊 Remaining: ₹15,000
```

**Scenario**: User tries to create 2nd installment again, but ₹15,000 has already been paid out of ₹30,000.

---

### Example 3: Pending Installment
```
⚠️ 3rd Installment: Already exists (Invoice #INV-1003)
⏳ Status: PENDING
📅 Due Date: 31 Mar 2024
💰 Amount: ₹20,000
```

**Scenario**: User tries to create 3rd installment again, but it already exists and is pending payment.

---

### Example 4: Multiple Duplicates
When creating 3 installments where 1st and 2nd already exist:

**Success Message**:
```
✅ 1 invoice(s) created successfully
```

**Error Messages** (shown separately):
```
⚠️ 1st Installment: Already exists (Invoice #INV-1001)
✅ Status: PAID on 15 Jan 2024
💰 Amount: ₹25,000
```

```
⚠️ 2nd Installment: Already exists (Invoice #INV-1002)
⏳ Status: PENDING
📅 Due Date: 28 Feb 2024
💰 Amount: ₹30,000
```

**Result**: Only 3rd installment is created, user is informed about existing 1st and 2nd.

---

## Backend Response Structure

### Duplicate Installment Response
```json
{
  "success": false,
  "message": "Installment 1 already exists for this quotation.",
  "error": "DUPLICATE_INSTALLMENT",
  "existingInvoice": {
    "invoiceNumber": "INV-1001",
    "status": "PAID",
    "total": 25000,
    "paidAmount": 25000,
    "remainingAmount": 0,
    "lastPaymentDate": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T09:00:00.000Z",
    "dueDate": "2024-01-31T00:00:00.000Z"
  }
}
```

---

## Status Types

### 1. PAID
- All amount has been paid
- Shows last payment date
- Green checkmark icon (✅)

### 2. PARTIALLY PAID
- Some amount paid, some remaining
- Shows paid amount, total amount, and remaining
- Warning icon (⚠️)

### 3. PENDING
- No payment made yet
- Shows due date
- Clock icon (⏳)

---

## User Flow

### Scenario: Creating Duplicate Installment

1. **User Action**: Selects quotation and tries to create 1st installment again

2. **Backend Check**: 
   - Finds existing invoice for installment 1
   - Retrieves payment details
   - Returns detailed error with invoice info

3. **Frontend Display**:
   - Shows toast notification with:
     - Invoice number
     - Payment status (PAID/PARTIALLY PAID/PENDING)
     - Amount details
     - Payment date (if paid)
     - Due date (if pending)

4. **User Decision**:
   - Can view existing invoice by clicking invoice number
   - Can create other installments
   - Cannot create duplicate

---

## Code Implementation

### Backend Check (routes/invoices.js)
```javascript
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
  
  // Get last payment date
  let lastPaymentDate = null;
  if (existingInstallment.payments?.length > 0) {
    lastPaymentDate = existingInstallment.payments[
      existingInstallment.payments.length - 1
    ].date;
  }
  
  return res.status(400).json({
    success: false,
    error: 'DUPLICATE_INSTALLMENT',
    existingInvoice: {
      invoiceNumber: existingInstallment.invoiceNumber,
      status: statusText,
      total: existingInstallment.total,
      paidAmount: existingInstallment.paidAmount,
      remainingAmount: existingInstallment.remainingAmount,
      lastPaymentDate: lastPaymentDate,
      dueDate: existingInstallment.dueDate
    }
  });
}
```

### Frontend Alert (InvoiceBuilder.jsx)
```javascript
if (errData?.error === 'DUPLICATE_INSTALLMENT') {
  const existing = errData.existingInvoice;
  let alertMessage = `${inst.label}: Already exists (Invoice #${existing.invoiceNumber})`;
  
  if (existing.status === 'PAID') {
    const paidDate = new Date(existing.lastPaymentDate)
      .toLocaleDateString('en-IN');
    alertMessage += `\n✅ Status: PAID on ${paidDate}`;
    alertMessage += `\n💰 Amount: ${formatINR(existing.total)}`;
  } else if (existing.status === 'PARTIALLY PAID') {
    alertMessage += `\n⚠️ Status: PARTIALLY PAID`;
    alertMessage += `\n💰 Paid: ${formatINR(existing.paidAmount)} / ${formatINR(existing.total)}`;
    alertMessage += `\n📊 Remaining: ${formatINR(existing.remainingAmount)}`;
  } else {
    const dueDate = new Date(existing.dueDate)
      .toLocaleDateString('en-IN');
    alertMessage += `\n⏳ Status: PENDING`;
    alertMessage += `\n📅 Due Date: ${dueDate}`;
    alertMessage += `\n💰 Amount: ${formatINR(existing.total)}`;
  }
  
  toast.error(alertMessage, { 
    duration: 8000,
    style: {
      whiteSpace: 'pre-line',
      maxWidth: '500px'
    }
  });
}
```

---

## Benefits

### For Users
✅ Clear visibility of existing invoices
✅ Know payment status immediately
✅ See when payment was made
✅ Understand remaining balance
✅ Avoid duplicate data entry

### For Business
✅ Prevents duplicate invoices
✅ Maintains data integrity
✅ Better payment tracking
✅ Reduces accounting errors
✅ Improves audit trail

---

## Testing Scenarios

### Test 1: Create Paid Installment Again
1. Create invoice for 1st installment
2. Record full payment
3. Try to create 1st installment again
4. **Expected**: Alert shows "PAID on [date]" with amount

### Test 2: Create Partial Installment Again
1. Create invoice for 2nd installment
2. Record partial payment (50%)
3. Try to create 2nd installment again
4. **Expected**: Alert shows "PARTIALLY PAID" with paid/remaining amounts

### Test 3: Create Pending Installment Again
1. Create invoice for 3rd installment
2. Don't record any payment
3. Try to create 3rd installment again
4. **Expected**: Alert shows "PENDING" with due date

### Test 4: Bulk Creation with Duplicates
1. Create invoices for installments 1, 2, 3
2. Try to create all 3 again
3. **Expected**: 
   - Error message for all 3
   - Each shows its current status
   - No new invoices created

### Test 5: Partial Bulk Creation
1. Create invoices for installments 1, 2
2. Try to create installments 1, 2, 3
3. **Expected**:
   - Success: 1 invoice created (3rd)
   - Warnings: 2 alerts for 1st and 2nd
   - Shows status of existing invoices

---

## Future Enhancements

1. **Clickable Invoice Links**: Make invoice number clickable to open invoice detail
2. **Payment History**: Show all payment transactions in alert
3. **Edit Option**: Allow editing existing invoice instead of creating new
4. **Bulk Status View**: Show all installments status before creation
5. **Smart Suggestions**: Suggest next unpaid installment
