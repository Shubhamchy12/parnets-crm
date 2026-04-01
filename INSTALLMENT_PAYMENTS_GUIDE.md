# Installment Payment Feature - Implementation Guide

## Overview

The Invoice and Payment module has been enhanced to support installment-based payments, allowing invoices to be paid in multiple parts instead of a single full payment. This feature provides flexibility for clients to pay large invoices over time according to a predefined payment schedule.

## Features Added

### 1. Installment Plan Management
- Create custom installment payment plans for any invoice
- Define multiple installments with individual amounts, due dates, and descriptions
- Automatic validation to ensure installment totals match invoice totals
- Track payment status for each installment (pending, partial, paid)

### 2. Payment Tracking
- Record payments against specific installments or as general payments
- Automatic status updates for installments when payments are received
- Real-time calculation of paid amounts and remaining balances per installment
- Complete payment history with installment associations

### 3. Visual Indicators
- Installment plan badge on invoice list for quick identification
- Detailed installment schedule display on invoice detail page
- Color-coded status indicators (pending, partial, paid)
- Progress tracking for each installment

## Database Schema Changes

### Invoice Model (`crm-backend/models/Invoice.js`)

#### New Schema: `installmentPlanSchema`
```javascript
{
  installmentNumber: Number,      // Sequential number (1, 2, 3...)
  label: String,                  // Display name (e.g., "First Payment", "Down Payment")
  amount: Number,                 // Amount for this installment
  dueDate: Date,                  // When this installment is due
  status: String,                 // 'pending', 'partial', 'paid'
  paidAmount: Number,             // Amount paid towards this installment
  description: String             // Optional notes
}
```

#### Updated Invoice Schema
- Added `installmentPlan: [installmentPlanSchema]` - Array of installment plans
- Added `hasInstallmentPlan: Boolean` - Flag to indicate if invoice uses installments

## API Endpoints

### Create Installment Plan
```
POST /api/invoices/:id/installment-plan
Authorization: Required (super_admin, admin, sales)

Body:
{
  "installments": [
    {
      "label": "First Payment",
      "amount": 50000,
      "dueDate": "2026-05-01",
      "description": "Initial payment"
    },
    {
      "label": "Second Payment",
      "amount": 50000,
      "dueDate": "2026-06-01",
      "description": "Final payment"
    }
  ]
}

Response:
{
  "success": true,
  "message": "Installment plan created",
  "data": { "invoice": {...} }
}
```

### Update Installment
```
PUT /api/invoices/:id/installment-plan/:installmentId
Authorization: Required (super_admin, admin, sales)

Body:
{
  "label": "Updated Label",
  "amount": 55000,
  "dueDate": "2026-05-15",
  "description": "Updated description"
}
```

### Remove Installment Plan
```
DELETE /api/invoices/:id/installment-plan
Authorization: Required (super_admin, admin, sales)

Response:
{
  "success": true,
  "message": "Installment plan removed"
}
```

### Record Payment (Enhanced)
```
POST /api/invoices/:id/payment
Authorization: Required (super_admin, admin, sales)

Body:
{
  "amount": 50000,
  "method": "bank_transfer",
  "reference": "TXN123456",
  "installmentId": "507f1f77bcf86cd799439011"  // Optional - links payment to specific installment
}
```

## Frontend Components

### InvoiceDetail Page Enhancements

#### 1. Setup Installments Button
- Visible when invoice doesn't have an installment plan
- Opens modal to create installment plan
- Only shown for unpaid invoices

#### 2. Installment Plan Display
- Table showing all installments with:
  - Installment label and description
  - Amount and due date
  - Paid amount
  - Status badge (color-coded)
- Remove plan button for flexibility

#### 3. Enhanced Payment Modal
- Dropdown to select specific installment (optional)
- Shows unpaid installments with amounts and due dates
- Allows general payments not tied to specific installments

#### 4. Installment Plan Creation Modal
- Dynamic form to add/remove installments
- Real-time total calculation
- Validation against invoice total
- Individual fields per installment:
  - Label (e.g., "First Payment")
  - Amount
  - Due Date
  - Description (optional)

### Invoices List Page
- Badge indicator for invoices with installment plans
- Quick visual identification in the invoice list

## Usage Workflow

### Creating an Installment Plan

1. Navigate to an invoice detail page
2. Click "Setup Installments" button
3. Add installments using the form:
   - Click "+ Add Another Installment" to add more
   - Fill in label, amount, due date for each
   - Ensure total matches invoice amount
4. Click "Create Plan"

### Recording Payments

1. Click "Record Payment" on invoice detail page
2. (Optional) Select specific installment from dropdown
3. Enter payment amount, method, and reference
4. Click "Record Payment"
5. System automatically:
   - Updates installment status
   - Recalculates remaining balances
   - Creates accounting transaction

### Viewing Installment Status

- Invoice detail page shows complete installment schedule
- Each installment displays:
  - Current status (pending/partial/paid)
  - Amount paid vs. total amount
  - Due date
  - Description

## Payment Logic

### Installment Status Calculation
```javascript
if (paidAmount >= installmentAmount) {
  status = 'paid'
} else if (paidAmount > 0) {
  status = 'partial'
} else {
  status = 'pending'
}
```

### Invoice Status
- Remains unchanged - based on total invoice amount
- `paid`: Total payments >= invoice total
- `partial`: Some payments received but less than total
- `draft`, `sent`, `overdue`: Based on invoice lifecycle

## Validation Rules

1. **Installment Total Must Match Invoice Total**
   - Sum of all installment amounts must equal invoice total
   - Validation occurs on plan creation
   - Error message shows mismatch if validation fails

2. **Installment Plan Immutability**
   - Once created, plan structure is fixed
   - Individual installments can be updated
   - Entire plan can be removed and recreated

3. **Payment Flexibility**
   - Payments can be linked to specific installments
   - Payments can be general (not linked to any installment)
   - Overpayments on installments are allowed

## Benefits

1. **Flexibility**: Clients can pay large invoices over time
2. **Transparency**: Clear payment schedule visible to all parties
3. **Tracking**: Detailed monitoring of which installments are paid
4. **Automation**: Automatic status updates and calculations
5. **Reporting**: Better cash flow forecasting with scheduled payments

## Example Use Cases

### Use Case 1: Project-Based Payment
```
Invoice Total: ₹500,000
Installments:
- Down Payment (30%): ₹150,000 - Due: Project Start
- Milestone 1 (30%): ₹150,000 - Due: 50% Completion
- Final Payment (40%): ₹200,000 - Due: Project Delivery
```

### Use Case 2: Monthly Subscription
```
Invoice Total: ₹120,000 (Annual)
Installments:
- Month 1-12: ₹10,000 each - Due: 1st of each month
```

### Use Case 3: Quarterly Payments
```
Invoice Total: ₹400,000
Installments:
- Q1 Payment: ₹100,000 - Due: March 31
- Q2 Payment: ₹100,000 - Due: June 30
- Q3 Payment: ₹100,000 - Due: September 30
- Q4 Payment: ₹100,000 - Due: December 31
```

## Technical Notes

### Backend
- Installment plans stored as subdocuments in Invoice model
- Mongoose subdocument IDs used for installment identification
- Payment recording updates both invoice and installment status
- Transaction records created for accounting integration

### Frontend
- React Query for state management and cache invalidation
- Real-time updates across all invoice views
- Optimistic UI updates for better UX
- Form validation before API calls

## Future Enhancements (Potential)

1. **Automated Reminders**: Send notifications before installment due dates
2. **Late Fee Calculation**: Automatic penalties for overdue installments
3. **Partial Payment Allocation**: Smart distribution of partial payments across installments
4. **Installment Templates**: Save common installment structures for reuse
5. **Bulk Installment Creation**: Create installment plans for multiple invoices
6. **Payment Links**: Generate unique payment links per installment
7. **Recurring Installments**: Auto-generate installments for recurring invoices

## Testing Checklist

- [ ] Create invoice with installment plan
- [ ] Verify installment total validation
- [ ] Record payment against specific installment
- [ ] Record general payment (no installment selected)
- [ ] Verify installment status updates (pending → partial → paid)
- [ ] Update individual installment details
- [ ] Remove installment plan
- [ ] View installment plan in invoice list
- [ ] Check payment history shows installment associations
- [ ] Verify accounting transactions created correctly

## Support

For issues or questions about the installment payment feature, please contact the development team or refer to the main CRM documentation.
