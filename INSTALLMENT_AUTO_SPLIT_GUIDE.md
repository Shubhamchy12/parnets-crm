# Installment Auto-Split Guide

## Problem

When generating invoices with installments, the amounts were not splitting correctly. Users expected:
- Total: ₹50,00,000
- 2 Installments: ₹25,00,000 each

But were getting wrong amounts.

## Solution

### 1. Backend Fix (Already Applied)

The backend now correctly uses the provided installment amount instead of recalculating from items.

### 2. Frontend Improvements

Added better controls and logging to the InvoiceBuilder:

#### A. "Clear & Auto-Split" Button

**Location**: Invoice Builder → Step 4 (Installment Setup)

**What it does**:
1. Clears all existing installment amounts
2. Divides total equally across installments
3. Shows console logs for debugging

**When to use**:
- When payment terms parsed wrong amounts
- When you want to override existing amounts
- When you want equal split

#### B. "Recalculate" Button

**What it does**:
- Recalculates amounts based on current total
- Keeps existing amounts if they're already set
- Useful for adjusting after changing item amounts

#### C. Console Logging

Now shows detailed logs in browser console:
```
🔢 Auto-splitting ₹50,00,000 into 2 installments
   Per installment: ₹25,00,000
   1. 1st Installment: ₹25,00,000
   2. 2nd Installment: ₹25,00,000
```

## How to Use

### Scenario 1: Creating New Installment Invoices

1. **Select Quotation**
   - Quotation total: ₹50,00,000
   - Items auto-populate

2. **Choose "Installments"**
   - System auto-switches if payment terms detected

3. **Check Amounts**
   - Look at installment amounts
   - Should be evenly split

4. **If Amounts are Wrong**
   - Click "Clear & Auto-Split"
   - Amounts will be recalculated equally

5. **Adjust if Needed**
   - Manually edit any installment amount
   - Or change installment count and recalculate

6. **Select Installments to Create**
   - Check which ones to create now
   - Can create one or multiple

7. **Create Invoices**

### Scenario 2: Amounts from Payment Terms

If quotation has payment terms like:
```
1st Installment: ₹30,00,000
2nd Installment: ₹20,00,000
```

The system will:
1. Parse these amounts automatically
2. Pre-fill installment fields
3. You can accept or click "Clear & Auto-Split" for equal split

### Scenario 3: Custom Split

For unequal installments:
1. Select installment count
2. Click "Clear & Auto-Split" to start fresh
3. Manually edit each installment amount
4. Ensure total matches invoice total

## Debugging

### Check Browser Console

Open browser console (F12) and look for:

```
✅ Good Signs:
🔢 Auto-splitting ₹50,00,000 into 2 installments
   Per installment: ₹25,00,000
   1. 1st Installment: ₹25,00,000
   2. 2nd Installment: ₹25,00,000

📤 Creating invoice for installment 1:
   installmentNumber: 1
   installmentLabel: "1st Installment"
   amount: 2500000

❌ Warning Signs:
⏭️ Skipping auto-split - installments already have amounts
   (This means amounts were parsed from payment terms)
   
📤 Creating invoice for installment 1:
   amount: 5000000  ← WRONG! Should be 2500000
```

### Common Issues

**Issue 1: Amounts not splitting**
- **Cause**: Payment terms already set amounts
- **Fix**: Click "Clear & Auto-Split"

**Issue 2: Total doesn't match**
- **Cause**: Manual edits don't add up
- **Fix**: Check sum of all installments = invoice total

**Issue 3: Backend still shows wrong amount**
- **Cause**: Backend not restarted after fix
- **Fix**: Restart backend server

## Testing Steps

1. **Create quotation** with ₹1,00,000 total
2. **Approve quotation**
3. **Go to New Invoice**
4. **Select the quotation**
5. **Choose "Installments"**
6. **Select 2 installments**
7. **Check amounts**: Should show ₹50,000 each
8. **If wrong**: Click "Clear & Auto-Split"
9. **Verify**: Both show ₹50,000
10. **Create 1st installment**
11. **Check invoice detail**: Should show ₹50,000 (not ₹1,00,000)

## Expected Behavior

### Equal Split (Default)
```
Total: ₹1,00,000
Installments: 4

Result:
1st: ₹25,000
2nd: ₹25,000
3rd: ₹25,000
4th: ₹25,000
```

### Unequal Split (Custom)
```
Total: ₹1,00,000
Installments: 3

Custom:
1st: ₹40,000 (40%)
2nd: ₹35,000 (35%)
3rd: ₹25,000 (25%)
```

### With Rounding
```
Total: ₹1,00,001
Installments: 3

Result:
1st: ₹33,334
2nd: ₹33,334
3rd: ₹33,333 (adjusted for rounding)
```

## Summary

- ✅ Backend correctly uses provided amounts
- ✅ Frontend has "Clear & Auto-Split" button
- ✅ Console logging for debugging
- ✅ Flexible: equal or custom splits
- ✅ Validation: warns if totals don't match

**Key Point**: Always verify installment amounts before creating invoices. Use "Clear & Auto-Split" if amounts look wrong!
