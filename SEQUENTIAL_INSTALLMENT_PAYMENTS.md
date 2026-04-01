# Sequential Installment Payment Implementation

## Overview
Implemented a sequential installment payment system where users can only create and pay installments in order. Once an installment is paid, it becomes disabled and the next installment becomes available.

## Key Features

### 1. Sequential Payment Flow
- Users can only select one installment at a time
- Paid installments are automatically disabled
- Next unpaid installment is auto-selected
- Visual indicators show payment status for each installment

### 2. Existing Invoice Display
When a quotation is selected, the system:
- Fetches all existing invoices for that quotation
- Displays them with payment status (Paid, Partial, Pending)
- Shows invoice numbers and amounts
- Highlights completed payments with green checkmarks

### 3. Installment Selection UI
- Radio button selection for installments
- Color-coded status indicators:
  - **Green**: Paid installments (disabled)
  - **Amber**: Partially paid (disabled)
  - **Indigo**: Next available installment (selectable)
  - **Gray**: Future installments (disabled)
- Payment details shown for existing invoices

### 4. Smart Auto-Selection
- Automatically selects the next unpaid installment
- If all installments are paid, selects the next sequential installment
- Prevents creating duplicate invoices

## Technical Implementation

### Frontend Changes (InvoiceBuilder.jsx)

#### New State Variables
```javascript
const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState(null);
const [existingInvoices, setExistingInvoices] = useState([]);
```

#### New Functions

**fetchExistingInvoices(quotationId)**
- Fetches all invoices for the selected quotation
- Auto-selects the next unpaid installment
- Updates UI to show existing payment status

**Updated handleQuotationChange()**
- Now calls `fetchExistingInvoices()` when a quotation is selected
- Resets selection state when quotation is cleared

**Updated handleSubmit()**
- Only creates invoice for the selected installment
- Calculates `alreadyPaid` from existing paid invoices
- Updates `totalPaidSoFar` correctly

### UI Components

#### Existing Invoices Summary Card
Shows all existing invoices with:
- Installment number and label
- Invoice number
- Payment status badge
- Amount paid/total

#### Sequential Installment Selection
- Radio button group for installment selection
- Disabled state for paid/unavailable installments
- Visual feedback for payment status
- Payment details for existing invoices

#### Selected Installment Details
- Only shows details for the selected installment
- Editable fields: Label, Amount, Due Date
- Highlighted with indigo/purple gradient

## User Flow

1. **Select Quotation**
   - System fetches existing invoices
   - Displays payment status summary
   - Auto-selects next unpaid installment

2. **View Installment Status**
   - See which installments are paid (green)
   - See which installments are pending (gray)
   - See which installment is next (indigo)

3. **Select Installment**
   - Can only select the next unpaid installment
   - Paid installments are disabled
   - Future installments are locked

4. **Edit Installment Details**
   - Modify label, amount, and due date
   - Only for the selected installment

5. **Create Invoice**
   - Button shows which installment will be created
   - Creates single invoice for selected installment
   - Navigates to created invoice

6. **Sequential Payment**
   - After payment, return to create next installment
   - System automatically selects next unpaid
   - Process repeats until all installments are paid

## Benefits

1. **Prevents Errors**: Can't skip installments or create duplicates
2. **Clear Status**: Visual indicators show payment progress
3. **Simplified UX**: Only one installment at a time reduces confusion
4. **Audit Trail**: All existing invoices visible at a glance
5. **Flexible**: Can still edit installment details before creation

## Example Scenario

**3-Installment Payment Plan:**

1. **Initial State**: All installments pending
   - 1st Installment: ✅ Selectable (auto-selected)
   - 2nd Installment: 🔒 Locked
   - 3rd Installment: 🔒 Locked

2. **After 1st Payment**: 
   - 1st Installment: ✅ Paid (disabled, green)
   - 2nd Installment: ✅ Selectable (auto-selected)
   - 3rd Installment: 🔒 Locked

3. **After 2nd Payment**:
   - 1st Installment: ✅ Paid (disabled, green)
   - 2nd Installment: ✅ Paid (disabled, green)
   - 3rd Installment: ✅ Selectable (auto-selected)

4. **All Paid**:
   - 1st Installment: ✅ Paid (disabled, green)
   - 2nd Installment: ✅ Paid (disabled, green)
   - 3rd Installment: ✅ Paid (disabled, green)

## API Integration

Uses existing endpoint:
- `GET /api/invoices/by-quote/:quoteId` - Fetches existing invoices

The frontend service method:
```javascript
invoiceService.getByQuote(quotationId)
```

## Future Enhancements

1. Allow partial payments within installments
2. Add payment reminders for upcoming installments
3. Show payment history timeline
4. Export installment payment schedule
5. Bulk payment recording for multiple installments
