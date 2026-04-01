# Installment Payments - Quick Start Guide

## What's New?

You can now split invoice payments into multiple installments with custom amounts and due dates. Perfect for large projects, subscriptions, or any payment that needs to be spread over time.

## How to Use

### Step 1: Create an Invoice
1. Go to **Invoices** → **New Invoice**
2. Fill in client details and line items as usual
3. Save the invoice

### Step 2: Setup Installment Plan
1. Open the invoice you just created
2. Click **"Setup Installments"** button (purple button in header)
3. In the modal that opens:
   - Fill in details for first installment:
     - **Label**: e.g., "First Payment", "Down Payment"
     - **Amount**: How much for this installment
     - **Due Date**: When it's due
     - **Description**: Optional notes
   - Click **"+ Add Another Installment"** to add more
   - Make sure total equals invoice amount
4. Click **"Create Plan"**

### Step 3: Record Payments
1. When client pays, click **"Record Payment"** button
2. Select the installment from dropdown (or leave as "General Payment")
3. Enter:
   - Amount received
   - Payment method (Bank Transfer, UPI, etc.)
   - Reference/Transaction ID
4. Click **"Record Payment"**

The system automatically:
- Updates installment status (Pending → Partial → Paid)
- Calculates remaining balance
- Creates accounting transaction

## Example Scenario

**Invoice Total: ₹100,000**

### Setup 3 Installments:
1. **Down Payment** - ₹30,000 - Due: May 1, 2026
2. **Mid Payment** - ₹30,000 - Due: June 1, 2026
3. **Final Payment** - ₹40,000 - Due: July 1, 2026

### When Client Pays:
- May 1: Receive ₹30,000 → Select "Down Payment" → Status: Paid ✅
- June 1: Receive ₹30,000 → Select "Mid Payment" → Status: Paid ✅
- July 1: Receive ₹40,000 → Select "Final Payment" → Status: Paid ✅

## Visual Indicators

### Invoice List
- Invoices with installment plans show a purple **"Installments"** badge

### Invoice Detail Page
- **Installment Plan Table** shows:
  - Each installment with label and description
  - Amount and due date
  - How much has been paid
  - Status badge (color-coded):
    - 🟢 Green = Paid
    - 🟡 Amber = Partially Paid
    - ⚪ Gray = Pending

## Tips & Best Practices

### ✅ Do's
- Ensure installment totals equal invoice total
- Use clear, descriptive labels (e.g., "Q1 Payment", "Milestone 1")
- Set realistic due dates
- Record payments promptly for accurate tracking

### ❌ Don'ts
- Don't create installment plan after invoice is fully paid
- Don't forget to select installment when recording payment (if applicable)
- Don't create overlapping due dates (can be confusing)

## Common Use Cases

### 1. Project Milestones
```
Total: ₹500,000
- Project Start (30%): ₹150,000
- 50% Complete (30%): ₹150,000
- Delivery (40%): ₹200,000
```

### 2. Monthly Payments
```
Total: ₹120,000 (Annual)
- Jan-Dec: ₹10,000 each month
```

### 3. Quarterly Payments
```
Total: ₹400,000
- Q1: ₹100,000 - March 31
- Q2: ₹100,000 - June 30
- Q3: ₹100,000 - September 30
- Q4: ₹100,000 - December 31
```

## Managing Installment Plans

### View Installment Plan
- Open any invoice with installments
- Scroll to **"Installment Payment Plan"** section
- See complete schedule with status

### Remove Installment Plan
- Open invoice
- In installment plan section, click **"Remove Plan"**
- Confirm removal
- Note: Payment history is preserved

### Update Installment
- Currently, you can remove and recreate the plan
- Individual installment editing coming in future updates

## Frequently Asked Questions

**Q: Can I add installments to existing invoices?**
A: Yes! Open any unpaid invoice and click "Setup Installments"

**Q: What if client pays different amount than installment?**
A: No problem! Record the actual amount received. Status will update to "Partial" if less than installment amount.

**Q: Can I record payment without selecting installment?**
A: Yes! Select "General Payment" in the dropdown. Payment will be recorded against invoice total.

**Q: What happens if I remove installment plan?**
A: The plan is removed but all payment history is preserved. Invoice totals remain unchanged.

**Q: Can I have different payment methods for different installments?**
A: Yes! Each payment can have its own method (Bank Transfer, UPI, Cash, etc.)

**Q: Does this work with the existing quotation-to-invoice flow?**
A: Yes! The existing multi-invoice creation from quotations still works. Installment plans are for single invoices that need multiple payments.

## Need Help?

- Check the detailed guide: `INSTALLMENT_PAYMENTS_GUIDE.md`
- Contact your system administrator
- Refer to the main CRM documentation

## Quick Reference

| Action | Location | Button/Link |
|--------|----------|-------------|
| Create Plan | Invoice Detail | "Setup Installments" (purple) |
| Record Payment | Invoice Detail | "Record Payment" (green) |
| View Plan | Invoice Detail | Scroll to "Installment Payment Plan" |
| Remove Plan | Invoice Detail | "Remove Plan" (in installment section) |
| See Badge | Invoice List | Purple "Installments" badge |

---

**Happy invoicing with installments! 🎉**
