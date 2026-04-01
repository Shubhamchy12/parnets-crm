# Multi-Select Installments Implementation

## Overview
Enhanced the invoice builder to support multi-select installments with automatic parsing from quotation payment terms, status display, and due date visibility.

## Key Features

### 1. Parse Installments from Quotation
When a quotation is selected, the system automatically extracts installment information from the `paymentTerms` field:

**Pattern Recognition:**
```
"1st Installment (1 Jan 2024 - 31 Jan 2024): ₹50,000"
"2nd Installment (1 Feb 2024 - 28 Feb 2024): ₹50,000"
```

**Extracted Data:**
- Installment label (1st, 2nd, 3rd, etc.)
- Amount (₹50,000)
- Due date (end date from date range)

### 2. Multi-Select with Checkboxes
Users can now select multiple installments to create at once:
- **Checkboxes** instead of radio buttons
- Select 1 or more installments
- Create multiple invoices in one submission

### 3. Status Display
Each installment shows its current status:
- **✅ Paid** (green) - Invoice paid, checkbox disabled
- **⏳ Pending Payment** (amber) - Invoice created but not paid
- **Not created yet** (gray) - No invoice exists

### 4. Due Date Visibility
- Shows due date for each installment
- Parsed from quotation payment terms
- Displayed in readable format (e.g., "31 Jan 2024")
- Editable before invoice creation

### 5. Invoice Number Display
For existing installments, shows:
- Invoice number (e.g., INV-1001)
- Payment status
- Due date

## User Interface

### Installment List
Each installment card shows:
```
[✓] 1  1st Installment                    ₹50,000
       ✅ Paid • INV-1001
       Due: 31 Jan 2024

[ ] 2  2nd Installment                    ₹50,000
       ⏳ Pending Payment • INV-1002
       Due: 28 Feb 2024

[ ] 3  3rd Installment                    ₹50,000
       Not created yet
       Due: 31 Mar 2024
```

### Selected Installments Details
Shows editable fields for all selected installments:
```
Selected Installment Details (2)

2nd Installment
  Label: [2nd Installment (1 Feb - 28 Feb)]
  Amount: [₹50,000]
  Due Date: [2024-02-28]

3rd Installment
  Label: [3rd Installment (1 Mar - 31 Mar)]
  Amount: [₹50,000]
  Due Date: [2024-03-31]
```

## Technical Implementation

### State Management
```javascript
const [selectedInstallmentIndexes, setSelectedInstallmentIndexes] = useState([]);
```

### Parse Payment Terms
```javascript
const parsePaymentTermsFromQuotation = (paymentTerms) => {
  const pattern = /(\d+(?:st|nd|rd|th))\s+Installment\s*(?:\(([^)]+)\))?\s*:?\s*₹?\s*([\d,]+)/gi;
  const matches = [...paymentTerms.matchAll(pattern)];
  
  if (matches.length > 0) {
    const parsedInstallments = matches.map((match, i) => {
      const ordinal = match[1];
      const dateRange = match[2] || '';
      const amount = match[3] ? match[3].replace(/,/g, '') : '';
      
      // Extract due date from date range
      let dueDate = '';
      if (dateRange) {
        const dateParts = dateRange.split('-');
        if (dateParts.length === 2) {
          const endDateStr = dateParts[1].trim();
          const parsed = new Date(endDateStr);
          if (!isNaN(parsed.getTime())) {
            dueDate = parsed.toISOString().slice(0, 10);
          }
        }
      }
      
      return {
        label: `${ordinal} Installment`,
        amount: amount || '',
        dueDate: dueDate || '',
      };
    });
    
    setInstallmentCount(parsedInstallments.length);
    setInstallments(parsedInstallments);
  }
};
```

### Toggle Selection
```javascript
const toggleInstallmentSelection = (index) => {
  setSelectedInstallmentIndexes(prev => {
    if (prev.includes(index)) {
      return prev.filter(i => i !== index);
    } else {
      return [...prev, index].sort((a, b) => a - b);
    }
  });
};
```

### Create Multiple Invoices
```javascript
const created = [];
const failed = [];
let alreadyPaid = calculatePaidAmount();

for (const instIndex of selectedInstallmentIndexes) {
  const inst = installments[instIndex];
  const instAmount = Number(inst.amount) || 0;
  const remaining = Math.max(0, invoiceTotal - alreadyPaid - instAmount);

  const payload = {
    // ... invoice data
    installmentNumber: instIndex + 1,
    installmentLabel: inst.label,
    total: instAmount,
    totalPaidSoFar: alreadyPaid,
    remainingAmount: remaining,
    dueDate: inst.dueDate,
  };

  try {
    const res = await invoiceService.create(payload);
    created.push(res.data?.data?.invoice);
    alreadyPaid += instAmount;
  } catch (err) {
    failed.push({ installment: instIndex + 1, message: err.message });
  }
}
```

### Match Existing Invoices
```javascript
const existingInvoice = existingInvoices.find(inv => inv.installmentNumber === i + 1);
const isPaid = existingInvoice?.status === 'paid';
```

## User Flow

### Scenario 1: Quotation with Payment Terms
1. Select quotation with payment terms:
   ```
   Payment Terms:
   1st Installment (1 Jan 2024 - 31 Jan 2024): ₹50,000
   2nd Installment (1 Feb 2024 - 28 Feb 2024): ₹50,000
   3rd Installment (1 Mar 2024 - 31 Mar 2024): ₹50,000
   ```

2. System automatically creates 3 installments with:
   - Labels: "1st Installment", "2nd Installment", "3rd Installment"
   - Amounts: ₹50,000 each
   - Due dates: 31 Jan, 28 Feb, 31 Mar

3. User sees list with status:
   - 1st: ✅ Paid (if already paid)
   - 2nd: ⏳ Pending (if invoice created)
   - 3rd: Not created yet

4. User selects 3rd installment
5. Edits details if needed
6. Creates invoice

### Scenario 2: Create Multiple Installments
1. Select quotation
2. Choose "Installments" payment type
3. Select multiple installments (e.g., 2nd and 3rd)
4. Edit details for both
5. Click "Create 2 Installments"
6. System creates both invoices
7. Shows success: "✅ 2 installment invoice(s) created successfully!"

### Scenario 3: Quotation without Payment Terms
1. Select quotation
2. Choose "Installments"
3. Select number of installments (2-10)
4. Amounts auto-split equally
5. Select which ones to create
6. Set labels and due dates manually
7. Create selected installments

## Benefits

1. **Automatic Parsing**: No manual entry if quotation has payment terms
2. **Visual Status**: Clear indication of paid/pending/not created
3. **Bulk Creation**: Create multiple installments at once
4. **Due Date Tracking**: Always visible for planning
5. **Flexible Selection**: Choose any combination of unpaid installments
6. **Error Handling**: Shows which installments succeeded/failed

## Example Payment Terms Format

The system recognizes these formats:

```
1st Installment (1 Jan 2024 - 31 Jan 2024): ₹50,000
2nd Installment (1 Feb 2024 - 28 Feb 2024): ₹50,000

1st Installment: ₹50,000
2nd Installment: ₹50,000

1st Installment (Jan 2024): 50000
2nd Installment (Feb 2024): 50000
```

## API Integration

### Fetch Existing Invoices
```javascript
GET /api/invoices/by-quote/:quoteId
```

Returns all invoices for the quotation, including:
- installmentNumber
- installmentLabel
- status (paid/partial/draft)
- dueDate
- invoiceNumber

### Create Multiple Installments
```javascript
POST /api/invoices (multiple times)
{
  installmentNumber: 2,
  installmentLabel: "2nd Installment",
  total: 50000,
  totalPaidSoFar: 50000,
  remainingAmount: 50000,
  dueDate: "2024-02-28"
}
```

## Future Enhancements

1. Bulk edit for selected installments
2. Copy installment details
3. Reorder installments
4. Custom installment schedules
5. Payment reminders based on due dates
6. Installment templates
7. Export installment schedule
8. Installment payment history timeline
