# 🛑 How to Test Payment Widget - Complete Guide

## Problem
You tracked a shipment but **don't see the payment button** on the tracking page.

## Why?
**The payment widget only appears when:**
```
shipment.customsCharge > 0
AND
shipment.currentStatus === "Held in Customs"
```

---

## Solution: 5-Step Test Workflow

### **STEP 1: Fix RLS Policies in Supabase** ⚠️ DO THIS FIRST

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Paste the entire content of **`SETTINGS_RLS_FIX.sql`**
4. Click **RUN** button
5. You should see ✅ success

**This fixes the error: "violates row-level security policy"**

---

### **STEP 2: Create or Find a Shipment**

**Option A: Create New Shipment**
```
1. Go to http://localhost:3000/#/ship
2. Fill in all required fields
3. Submit to create shipment
4. You'll get a tracking number like: NEC12345678
```

**Option B: Use Existing Shipment**
```
1. Go to http://localhost:3000/#/track
2. Enter the tracking number of your shipment
3. You'll see the shipment details
```

---

### **STEP 3: Login to Admin Panel**

```
1. Go to http://localhost:3000/#/admin
2. Email: nextexpresscourie@zohomail.com (or your admin email)
3. Password: [Your Supabase password]
4. Click "Authorize Session"
```

✅ You're now in the Admin Dashboard (Command Center)

---

### **STEP 4: Mark Shipment as "In Customs" with Charge**

**In the Admin Dashboard:**

1. **Find your shipment** in the ledger/list
2. **Click to select** it (it will highlight)
3. A **context menu** appears on the right
4. Click **"Protocol Command"** button (or status icon)
5. **Protocol Command Modal opens:**

```
┌──────────────────────────────────┐
│ PROTOCOL COMMAND                 │
├──────────────────────────────────┤
│                                  │
│ Status:                          │
│ [Select Status ▼] ← Select here  │
│ → Choose "Held in Customs"       │
│                                  │
│ Location:                        │
│ [New York Customs] ← Enter city  │
│                                  │
│ Description:                     │
│ [Package held for inspection...] │
│                                  │
│ 💰 Customs Charge (USD):         │
│ [50.00] ← ENTER AMOUNT HERE ✨   │
│                                  │
│      [APPLY] [CANCEL]            │
└──────────────────────────────────┘
```

**Fill in the form:**

| Field | Value | Example |
|-------|-------|---------|
| **Status** | Select from dropdown | `Held in Customs` |
| **Location** | Port/city name | `New York Customs` |
| **Description** | Reason for customs | `Package held for customs inspection` |
| **💰 Customs Charge** | ✨ **IMPORTANT** | `50.00` |

6. Click **[APPLY]** button
7. Shipment is updated with customs charge ✅

---

### **STEP 5: View Payment Widget on Tracking Page**

Now that the shipment has a customs charge:

1. Go to **Tracking Page**: `http://localhost:3000/#/track`
2. Enter your **tracking number**
3. Click **Track**
4. **SCROLL DOWN** in the shipment details
5. You should now see the **Payment Widget:**

```
┌─────────────────────────────────────┐
│        💰 CUSTOMS CHARGE DUE        │
├─────────────────────────────────────┤
│                                     │
│  [QR CODE]     Amount: $50.00       │
│                Wallet: bc1qxy...    │
│                [Copy] button        │
│                                     │
│  📋 Payment Instructions:           │
│  "Please send payment to..."        │
│                                     │
│  ⏳ Status: Payment Awaiting...      │
│                                     │
│  [I've Sent Payment - Notify Admin] │
│                                     │
└─────────────────────────────────────┘
```

---

## What You'll See

### **Payment Widget States**

**1. PENDING (Awaiting Payment)**
```
⏳ Payment Awaiting Verification
We're reviewing your payment. 
[I've Sent Payment - Notify Admin]
```

**2. CLAIMED (Customer Claimed Payment)**
```
⏳ Payment Awaiting Verification
We're reviewing your payment. This usually takes 1-2 hours.
```

**3. VERIFIED (Admin Confirmed)**
```
✓ Payment Verified
Your payment has been confirmed. Thank you!
```

---

## Testing Checklist

- [ ] **Step 1**: RLS fix applied (no more "violates RLS policy" errors)
- [ ] **Step 2**: Shipment exists with tracking number
- [ ] **Step 3**: Can login to admin panel
- [ ] **Step 4**: Can mark shipment as "In Customs"
- [ ] **Step 4**: Can enter customs charge amount ($50+)
- [ ] **Step 5**: Payment widget appears on tracking page
- [ ] **Step 5**: QR code is visible
- [ ] **Step 5**: Wallet address shows
- [ ] **Step 5**: Can click "I've Sent Payment" button

---

## If Payment Widget Still Doesn't Appear

**Check these:**

1. **Is `customsCharge > 0`?**
   ```sql
   SELECT id, tracking_number, customs_charge, payment_status 
   FROM shipments 
   WHERE tracking_number = 'NEC12345678';
   ```
   Must show: `customs_charge: 50.00` (not null, not 0)

2. **Is status "Held in Customs"?**
   ```sql
   SELECT current_status FROM shipments 
   WHERE tracking_number = 'NEC12345678';
   ```
   Must show: `current_status: 'Held in Customs'`

3. **Are you tracking the right shipment?**
   - Verify tracking number in browser URL
   - Should be: `http://localhost:3000/#/track/NEC12345678`

4. **Is payment_status set correctly?**
   ```sql
   SELECT id, customs_charge, payment_status 
   FROM shipments 
   WHERE customs_charge > 0;
   ```

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "RLS Policy Error" | Run SETTINGS_RLS_FIX.sql in Supabase |
| Can't login to admin | Check email/password with Supabase Auth |
| Can't see Protocol Command button | Click/select the shipment row first |
| Customs Charge field won't appear | Make sure status is "Held in Customs" |
| Payment widget not showing | Verify customs_charge > 0 in database |
| QR code shows "Loading..." | Ensure wallet address is configured in settings |

---

## Next: Configure Wallet Address

Once you see the payment widget:

1. Click **💰 Settings Icon** in admin toolbar
2. Enter your **Bitcoin/Crypto wallet address**
3. Click **Save Settings**
4. QR code will auto-generate from wallet address
5. Customers can now scan and send payment

---

## Complete Flow Diagram

```
┌─────────────────────┐
│   Create Shipment   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────┐
│ Login to Admin Panel         │
│ http://localhost:3000/#/admin
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Select Shipment from List   │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Click "Protocol Command"    │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Set Status: Held in Customs │
│ Enter Customs Charge: $50   │
│ Click APPLY                 │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Go to Tracking Page         │
│ http://localhost:3000/#/track
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ Enter Tracking Number       │
│ Click Track                 │
└──────────┬──────────────────┘
           │
           ↓
┌─────────────────────────────┐
│ ✅ PAYMENT WIDGET VISIBLE   │
│ Customer can scan QR code   │
│ and send payment            │
└─────────────────────────────┘
```

---

## Questions?

If payment widget still doesn't appear after following all steps:
1. Check browser console for errors (F12)
2. Check Supabase logs for database errors
3. Verify shipment data in Supabase directly
4. Ensure you're using the correct tracking number

Good luck! 🚀
