# Installment Price and Due Date Display Fix

## Issues Fixed

### 1. Installment Amounts Not Showing Correctly
**Problem**: Auto-split was overwriting amounts parsed from quotation payment terms

**Root Cause**: The auto-split effect was running every time `invoiceItems` changed, overwriting any amounts that were already set (from quotation parsing or manual entry).

**Solution**: 
- Added check to only auto-split if installments don't have amounts
- Prevents overwriting amounts from quotation payment terms
- Preserves manually entered amounts

```javascript
// Only auto-split if installments don't have amounts set
const hasAmounts = installments.some(inst => inst.amount && Number(inst.amount) > 0);
if (hasAmounts) return; // Don't overwrite existing amounts
```

### 2. Manual Recalculation Option
**Added**: "Recalculate Amounts" button

**Purpose**: Allows users to manually trigger equal split if needed

**Location**: Next to "Number of Installments" label

**Functionality**:
- Calculates total from invoice items
- Splits equally across installments
- Last installment gets remainder
- Shows success toast

### 3. Due Date Display
**Status**: Already working correctly

**How it works**:
1. Parsed from quotation payment terms if available
2. Displayed with calendar emoji (📅)
3. Shown in readable format (e.g., "31 Jan 2024")
4. Editable in installment details section

## Data Flow

### When Quotation is Selected:
```
1. handleQuotationChange()
   ↓
2. parsePaymentTermsFromQuotation()
   ↓
3. Extract installments with amounts and due dates
   ↓
4. setInstallments() with parsed data
   ↓
5. Auto-split effect sees amounts exist, skips overwriting
```

### When User Changes Installment Count:
```
1. User changes dropdown
   ↓
2. Resize effect creates new array
   ↓
3. Preserves existing amounts/dates where possible
   ↓
4. Auto-split checks if amounts exist
   ↓
5. Only fills empty amounts
```

### When User Clicks "Recalculate":
```
1. recalculateInstallments()
   ↓
2. Calculate total from invoice items
   ↓
3. Split equally (last gets remainder)
   ↓
4. Update all installment amounts
   ↓
5. Show success toast
```

## Console Logging

The system now logs detailed information:

### Quotation Parsing:
```
📋 Parsing payment terms: "1st Installment (1 Jan - 31 Jan): ₹50,000..."
🔍 Found matches: 3
  1. 1st - Range: "1 Jan 2024 - 31 Jan 2024" - Amount: 50000
     ✅ Parsed due date: 2024-01-31
  2. 2nd - Range: "1 Feb 2024 - 28 Feb 2024" - Amount: 50000
     ✅ Parsed due date: 2024-02-28
✅ Parsed installments: [...]
```

### Invoice Creation:
```
📤 Creating invoice for installment 1:
  installmentNumber: 1
  installmentLabel: "1st Installment"
  dueDate: "2024-01-31"
  amount: 50000
✅ Invoice created: INV-1001
```

### Fetching Existing:
```
🔄 Fetching existing invoices for quotation: 67abc...
📦 Received invoices: 2
  1. #1 - INV-1001
     Status: paid
     Due: 2024-01-31
     Total: 50000, Paid: 50000
     Payments: 1 transactions
       1. 50000 on 2024-01-15 via bank_transfer
```

## UI Improvements

### Before:
- Amounts would reset when changing items
- No way to manually recalculate
- Parsed amounts from quotation would be lost

### After:
- ✅ Amounts preserved from quotation parsing
- ✅ Manual recalculate button available
- ✅ Auto-split only when amounts are empty
- ✅ Due dates displayed with calendar icon
- ✅ Status shown for each installment
- ✅ Transaction details visible

## Testing Checklist

- [ ] Select quotation with payment terms
- [ ] Verify amounts are parsed correctly
- [ ] Verify due dates are shown
- [ ] Change installment count - amounts should adjust
- [ ] Add/remove invoice items - amounts should stay
- [ ] Click "Recalculate" - amounts should split equally
- [ ] Select installments - checkboxes should work
- [ ] Create invoices - data should save correctly
- [ ] View created invoices - amounts and dates should match

## Known Limitations

1. **Date Parsing**: Only recognizes format "DD MMM YYYY" (e.g., "31 Jan 2024")
2. **Amount Parsing**: Expects ₹ symbol or plain numbers
3. **Pattern Matching**: Requires "Installment" keyword in payment terms

## Future Enhancements

1. Support more date formats
2. Support different currency symbols
3. Allow custom installment patterns
4. Bulk edit installment amounts
5. Copy amounts from previous quotation
6. Installment templates
