# Installment Remaining Amount Fix

## Problem

When viewing an installment invoice (e.g., 2nd installment), if you recorded a payment on a different installment (e.g., 1st installment), the "Outstanding Balance" in the Project Summary section would show the wrong amount.

### Example Scenario:
```
Project Total: ₹50,00,000
2 Installments: ₹25,00,000 each

Actions:
1. Pay 2nd installment fully (₹25,00,000)
2. View 1st installment invoice

Expected:
- Outstanding Balance: ₹25,00,000 (only 1st unpaid)

Actual (BUG):
- Outstanding Balance: ₹50,00,000 (showing wrong amount)
```

## Root Cause

The issue was with **stale data** in the React Query cache:

1. When you record a payment on one invoice, it invalidates queries
2. The current invoice data refreshes ✅
3. But the `siblings` array (other installments) uses cached data ❌
4. The cached sibling data doesn't have the updated payment info
5. So the "Outstanding Balance" calculation uses old payment amounts

### Technical Details

**Before Fix**:
```javascript
// Siblings query with default caching
const { data: siblings = [] } = useQuery({
  queryKey: ['invoice-siblings', fromQuote],
  queryFn: () => invoiceService.getByQuote(fromQuote),
  enabled: !!fromQuote,
  // Uses default staleTime and cacheTime
});

// Payment mutation
const payMut = useMutation({
  onSuccess: () => {
    qc.invalidateQueries(['invoice-siblings', fromQuote]);
    // Invalidates but doesn't force refetch
  }
});

// Calculation uses stale sibling data
const grandPaid = siblings.reduce((s, x) => {
  const source = String(x._id) === String(id) ? inv : x;
  // x has old payment data if it's a sibling!
  return s + source.payments.reduce(...);
}, 0);
```

## Solution Applied

### 1. Disable Caching for Siblings Query

```javascript
const { data: siblings = [], refetch: refetchSiblings } = useQuery({
  queryKey: ['invoice-siblings', fromQuote],
  queryFn: () => invoiceService.getByQuote(fromQuote),
  enabled: !!fromQuote,
  staleTime: 0,  // Always consider data stale
  cacheTime: 0,  // Don't cache the data
});
```

**Why**: Installment payment data changes frequently and needs to be fresh.

### 2. Force Refetch After Payment

```javascript
const payMut = useMutation({
  onSuccess: async (response) => {
    // Invalidate queries
    qc.invalidateQueries(['invoice', id]);
    qc.invalidateQueries(['invoices']);
    qc.invalidateQueries(['invoice-siblings', fromQuote]);
    
    // Force immediate refetch of siblings
    if (refetchSiblings) {
      await refetchSiblings();
    }
    
    // ... rest of success handler
  }
});
```

**Why**: Ensures siblings data is refreshed immediately after payment, not on next render.

## How It Works Now

### Payment Flow:
```
1. User records payment on Invoice A
   ↓
2. Backend updates Invoice A
   ↓
3. Frontend mutation succeeds
   ↓
4. Invalidate all invoice queries
   ↓
5. Force refetch siblings immediately
   ↓
6. Siblings array now has fresh payment data
   ↓
7. Outstanding Balance calculates correctly
```

### Data Freshness:
```
Before Payment:
- Invoice 1: ₹0 paid, ₹25,00,000 due
- Invoice 2: ₹0 paid, ₹25,00,000 due
- Outstanding: ₹50,00,000 ✅

After Paying Invoice 2:
- Invoice 1: ₹0 paid, ₹25,00,000 due
- Invoice 2: ₹25,00,000 paid, ₹0 due (FRESH DATA)
- Outstanding: ₹25,00,000 ✅

View Invoice 1:
- Siblings array includes Invoice 2 with FRESH payment data
- Calculation: ₹50,00,000 total - ₹25,00,000 paid = ₹25,00,000 ✅
```

## Testing Scenarios

### Scenario 1: Pay 2nd, View 1st
```
1. Create 2 installments (₹25L each)
2. Record payment on 2nd installment (₹25L)
3. Navigate to 1st installment
4. Check "Outstanding Balance"
Expected: ₹25,00,000 ✅
```

### Scenario 2: Pay 1st, View 2nd
```
1. Create 2 installments (₹25L each)
2. Record payment on 1st installment (₹25L)
3. Navigate to 2nd installment
4. Check "Outstanding Balance"
Expected: ₹25,00,000 ✅
```

### Scenario 3: Partial Payments
```
1. Create 2 installments (₹25L each)
2. Pay ₹10L on 1st installment
3. Pay ₹15L on 2nd installment
4. View either invoice
Expected: Outstanding = ₹25,00,000 (₹50L - ₹25L) ✅
```

### Scenario 4: Multiple Installments
```
1. Create 4 installments (₹12.5L each)
2. Pay 1st fully (₹12.5L)
3. Pay 3rd fully (₹12.5L)
4. View 2nd or 4th installment
Expected: Outstanding = ₹25,00,000 (2 unpaid) ✅
```

## Performance Considerations

### Cache Disabled - Is This OK?

**Yes**, because:
1. Siblings query only runs when viewing invoice detail
2. Not a high-frequency operation
3. Data accuracy is more important than cache performance
4. Query is fast (fetches by quotation ID with index)
5. Typical result: 2-10 invoices (small dataset)

### Alternative Approaches Considered

1. **Optimistic Updates**: Complex, error-prone
2. **WebSocket Updates**: Overkill for this use case
3. **Polling**: Wasteful, unnecessary
4. **Manual Cache Updates**: Fragile, hard to maintain

**Chosen approach** (disable cache + force refetch) is:
- Simple
- Reliable
- Easy to understand
- Minimal performance impact

## Benefits

- ✅ Always shows correct outstanding balance
- ✅ Works regardless of which installment you're viewing
- ✅ Handles partial payments correctly
- ✅ Updates immediately after payment
- ✅ No stale data issues
- ✅ Simple, maintainable solution

## Summary

Fixed the installment remaining amount calculation by:
1. Disabling cache for siblings query (`staleTime: 0, cacheTime: 0`)
2. Force refetching siblings after payment (`await refetchSiblings()`)
3. Ensuring all payment data is fresh when calculating totals

**Result**: Outstanding Balance now always shows the correct amount, regardless of which installment was paid or which invoice you're viewing.

---

**Status**: ✅ Fixed and tested
**Date**: 2026-04-01
**File Modified**: `crm-frontent/src/pages/InvoiceDetail.jsx`
