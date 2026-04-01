# Installment Payment Feature - Flow Diagrams

## 1. Installment Plan Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     INVOICE DETAIL PAGE                         │
│                                                                 │
│  Invoice: INV-1001                                             │
│  Total: ₹100,000                                               │
│  Status: Draft                                                 │
│                                                                 │
│  [Setup Installments] ← Click this button                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              INSTALLMENT PLAN CREATION MODAL                    │
│                                                                 │
│  Invoice Total: ₹100,000                                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Installment 1                              [Remove]     │  │
│  │ Label: First Payment                                    │  │
│  │ Amount: ₹30,000                                         │  │
│  │ Due Date: 2026-05-01                                    │  │
│  │ Description: Initial payment                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Installment 2                              [Remove]     │  │
│  │ Label: Second Payment                                   │  │
│  │ Amount: ₹30,000                                         │  │
│  │ Due Date: 2026-06-01                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Installment 3                              [Remove]     │  │
│  │ Label: Final Payment                                    │  │
│  │ Amount: ₹40,000                                         │  │
│  │ Due Date: 2026-07-01                                    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [+ Add Another Installment]                                   │
│                                                                 │
│  Total Installments: ₹100,000 ✓                               │
│                                                                 │
│  [Create Plan]  [Cancel]                                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              INSTALLMENT PLAN CREATED ✓                         │
│                                                                 │
│  Installment Payment Plan                    [Remove Plan]     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Installment    │ Amount    │ Due Date   │ Paid │ Status │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ First Payment  │ ₹30,000   │ 01 May 26  │ ₹0   │ ⚪ pending│  │
│  │ Second Payment │ ₹30,000   │ 01 Jun 26  │ ₹0   │ ⚪ pending│  │
│  │ Final Payment  │ ₹40,000   │ 01 Jul 26  │ ₹0   │ ⚪ pending│  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Payment Recording Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     INVOICE DETAIL PAGE                         │
│                                                                 │
│  Installment Payment Plan                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ First Payment  │ ₹30,000 │ 01 May 26 │ ₹0    │ ⚪ pending│  │
│  │ Second Payment │ ₹30,000 │ 01 Jun 26 │ ₹0    │ ⚪ pending│  │
│  │ Final Payment  │ ₹40,000 │ 01 Jul 26 │ ₹0    │ ⚪ pending│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Record Payment] ← Click this button                          │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RECORD PAYMENT MODAL                           │
│                                                                 │
│  Select Installment:                                           │
│  [First Payment - ₹30,000 (Due: 01 May 2026) ▼]              │
│                                                                 │
│  Amount (₹): [30000]                                           │
│                                                                 │
│  Payment Method: [Bank Transfer ▼]                            │
│                                                                 │
│  Reference: [TXN123456]                                        │
│                                                                 │
│  [Record Payment]  [Cancel]                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PAYMENT RECORDED ✓                                 │
│                                                                 │
│  Installment Payment Plan                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ First Payment  │ ₹30,000 │ 01 May 26 │ ₹30,000 │ 🟢 paid │  │
│  │ Second Payment │ ₹30,000 │ 01 Jun 26 │ ₹0      │ ⚪ pending│  │
│  │ Final Payment  │ ₹40,000 │ 01 Jul 26 │ ₹0      │ ⚪ pending│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Payment History                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Date       │ Method         │ Reference │ Amount        │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ 01 May 26  │ Bank Transfer  │ TXN123456 │ ₹30,000      │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Partial Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Client pays ₹15,000 instead of full ₹30,000                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RECORD PAYMENT MODAL                           │
│                                                                 │
│  Select Installment:                                           │
│  [Second Payment - ₹30,000 (Due: 01 Jun 2026) ▼]             │
│                                                                 │
│  Amount (₹): [15000] ← Partial amount                          │
│                                                                 │
│  [Record Payment]                                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PARTIAL PAYMENT RECORDED ✓                         │
│                                                                 │
│  Installment Payment Plan                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ First Payment  │ ₹30,000 │ 01 May 26 │ ₹30,000 │ 🟢 paid │  │
│  │ Second Payment │ ₹30,000 │ 01 Jun 26 │ ₹15,000 │ 🟡 partial│ │
│  │ Final Payment  │ ₹40,000 │ 01 Jul 26 │ ₹0      │ ⚪ pending│  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Remaining for Second Payment: ₹15,000                         │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Status Progression

```
┌──────────────┐
│   PENDING    │  No payment received
│   ⚪ Gray    │  paidAmount = 0
└──────────────┘
       │
       │ Partial payment received
       ▼
┌──────────────┐
│   PARTIAL    │  Some payment received
│   🟡 Amber   │  0 < paidAmount < amount
└──────────────┘
       │
       │ Full payment received
       ▼
┌──────────────┐
│     PAID     │  Full payment received
│   🟢 Green   │  paidAmount >= amount
└──────────────┘
```

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  InvoiceDetail   │  │  Invoices List   │                   │
│  │      Page        │  │      Page        │                   │
│  └────────┬─────────┘  └────────┬─────────┘                   │
│           │                     │                              │
│           │  ┌──────────────────┴─────────────────┐           │
│           │  │                                     │           │
│           ▼  ▼                                     ▼           │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           invoiceService.js (API Client)                │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ HTTP Requests
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                         BACKEND                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         routes/invoices.js (API Endpoints)              │  │
│  │                                                          │  │
│  │  POST   /api/invoices/:id/installment-plan             │  │
│  │  PUT    /api/invoices/:id/installment-plan/:instId     │  │
│  │  DELETE /api/invoices/:id/installment-plan             │  │
│  │  POST   /api/invoices/:id/payment (enhanced)           │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │         models/Invoice.js (Data Model)                  │  │
│  │                                                          │  │
│  │  - installmentPlan: [installmentPlanSchema]            │  │
│  │  - hasInstallmentPlan: Boolean                         │  │
│  │  - payments: [paymentSchema] (enhanced)                │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              MongoDB Database                           │  │
│  │                                                          │  │
│  │  invoices collection                                    │  │
│  │  └─ installmentPlan (subdocuments)                     │  │
│  │     └─ installmentNumber, label, amount, dueDate...    │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Data Flow: Payment Recording

```
User Action                API Call                Database Update
─────────────────────────────────────────────────────────────────

[Record Payment]
     │
     ├─ Select Installment
     ├─ Enter Amount
     ├─ Enter Method
     └─ Click Submit
           │
           ▼
    POST /api/invoices/:id/payment
    {
      amount: 30000,
      method: "bank_transfer",
      installmentId: "abc123",
      reference: "TXN123"
    }
           │
           ▼
    Backend Processing:
    1. Find invoice
    2. Add payment to payments[]
    3. Find installment by ID
    4. Update installment.paidAmount
    5. Calculate installment.status
    6. Update invoice totals
    7. Create Transaction record
           │
           ▼
    MongoDB Update:
    {
      $push: { payments: {...} },
      $set: {
        "installmentPlan.$.paidAmount": 30000,
        "installmentPlan.$.status": "paid",
        paidAmount: 30000,
        status: "partial"
      }
    }
           │
           ▼
    Response:
    {
      success: true,
      message: "Payment recorded",
      data: { invoice: {...} }
    }
           │
           ▼
    Frontend Update:
    - Refresh invoice data
    - Update UI
    - Show success toast
    - Close modal
```

## 7. Invoice List View

```
┌─────────────────────────────────────────────────────────────────┐
│                        INVOICES LIST                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Invoice #        │ Client    │ Amount   │ Status        │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ INV-1001         │ Acme Corp │ ₹100,000 │ 🟡 Partial   │  │
│  │ [Installments]   │           │          │               │  │
│  │                  │           │          │               │  │
│  │ INV-1002         │ Tech Inc  │ ₹50,000  │ 🟢 Paid      │  │
│  │                  │           │          │               │  │
│  │ INV-1003         │ StartupXY │ ₹200,000 │ ⚪ Draft     │  │
│  │ [Installments]   │           │          │               │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Purple "Installments" badge = Has installment plan            │
└─────────────────────────────────────────────────────────────────┘
```

## Legend

- 🟢 Green = Paid / Completed
- 🟡 Amber = Partial / In Progress
- ⚪ Gray = Pending / Not Started
- [Button] = Clickable button
- [Dropdown ▼] = Dropdown selector
- [Input] = Text/Number input field

---

These diagrams illustrate the complete flow of the installment payment feature from creation to payment recording.
