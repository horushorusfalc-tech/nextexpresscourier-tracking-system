# 💰 Wallet Configuration Guide

## Quick Summary
To add wallet details for payment processing:

1. **Login** to admin panel (`http://localhost:3000/#/admin`)
2. **Click the 💰 icon** in the top-right toolbar
3. **Fill in wallet address** and payment instructions
4. **Save** - wallet details are stored in Supabase

---

## Step-by-Step Setup

### **Step 1: Login to Admin Panel**
Navigate to: `http://localhost:3000/#/admin`

**Requirements:**
- You need an admin account in Supabase
- Email: Must be configured in your Supabase `auth.users` table with `role: 'ADMIN'`
- Password: Your Supabase auth password

**Example Demo Credentials:**
```
Email: nextexpresscourie@zohomail.com
Password: [Your Supabase password]
```

### **Step 2: Locate Settings Button**

Once logged in, you'll see the **Admin Dashboard (Command Center)**.

In the **top-right toolbar**, next to "View Mode" buttons, find the **💰 Money Bag Icon**

```
┌─────────────────────────────────────────┐
│  Command Center                    [💰] │  ← Click here
└─────────────────────────────────────────┘
```

### **Step 3: Open Payment Settings Modal**

Click the 💰 icon to open the **Payment Settings Modal**

```
╔════════════════════════════════════════════╗
║     SYSTEM CONFIGURATION                   ║
║     Payment Settings                    [X]║
║                                            ║
║  💰 Primary Wallet Address                 ║
║  [bc1qxy2kgdygjrsqtzq2n0yrf2493...]        ║
║  This wallet address will be displayed to  ║
║  customers for payment                     ║
║                                            ║
║  💰 Secondary Wallet Address (Optional)    ║
║  [____________________________]             ║
║  Backup wallet address (not currently     ║
║  displayed to customers)                  ║
║                                            ║
║  📋 Payment Instructions                   ║
║  [Multiple lines of instructions...]       ║
║  These instructions appear on the payment  ║
║  widget for customers                      ║
║                                            ║
║            [SAVE SETTINGS]                 ║
╚════════════════════════════════════════════╝
```

### **Step 4: Fill in Wallet Details**

**Primary Wallet Address** (Required)
- Your cryptocurrency wallet address where customers send payments
- Example: `bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh` (Bitcoin)
- Or: `0x742d35Cc6634C0532925a3b844Bc9e7595f42fD4` (Ethereum)

**Secondary Wallet Address** (Optional)
- Backup wallet address for redundancy
- Currently stored but not displayed to customers

**Payment Instructions** (Optional but Recommended)
- Custom instructions for customers
- Example:
  ```
  Please send payment to the wallet address above.
  Include your tracking number in the memo field if possible.
  Payment usually confirms within 1-2 hours.
  For assistance, contact nextexpresscourie@zohomail.com
  ```

### **Step 5: Save Settings**

Click the **[SAVE SETTINGS]** button

- ✅ Success message confirms wallet saved
- Settings stored in Supabase `settings` table
- QR code wallet address immediately available to customers

---

## What Happens Next

### **1. Customer Sees Payment Widget**
When a shipment has a customs charge:
- Customer visits tracking page
- **PaymentWidget** displays with:
  - ✓ QR code of wallet address
  - ✓ Wallet address (copyable)
  - ✓ Your custom payment instructions
  - ✓ Customs charge amount

### **2. Customer Sends Payment**
- Scans QR code or copies wallet address
- Sends payment to wallet
- Clicks "I've Sent Payment - Notify Admin"

### **3. Admin Verifies Payment**
- Admin sees payment pending badge in shipment list
- Admin clicks verify button
- Admin confirms payment (optional: adds notes)
- **Shipment status auto-advances to "Customs Cleared"**

### **4. Customer Sees Confirmation**
- Tracking page shows green "✓ Payment Verified" badge
- Shipment progresses to next status

---

## Wallet Address Examples

### Bitcoin
```
Legacy Address: 1A1z7agoat2LLLLLLLLLLLLLLLLLLLLL1
SegWit Address: 3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy
Native SegWit: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
```

### Ethereum
```
Ethereum Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f42fD4
```

### Other Cryptocurrencies
- Litecoin: `LTC1A1z7agoat2LLLLLLLL...`
- Ripple: `rN7n7otQDd6FczFgLdDqMjsXA...`
- Solana: `9B5X3UstHwanX9CMU16TZGCkUHe...`

---

## Storage Details

### Where Wallet is Stored
**Supabase Table: `settings`**

```sql
SELECT * FROM settings WHERE key IN (
  'wallet_address',
  'wallet_address_secondary', 
  'payment_instructions'
);
```

**Result Structure:**
```json
[
  {
    "key": "wallet_address",
    "value": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "description": "Primary Bitcoin/Crypto wallet...",
    "updated_at": "2026-05-31T12:00:00Z"
  },
  {
    "key": "wallet_address_secondary",
    "value": "",
    "description": "Optional secondary wallet...",
    "updated_at": "2026-05-31T12:00:00Z"
  },
  {
    "key": "payment_instructions",
    "value": "Please send payment to...",
    "description": "Custom payment instructions...",
    "updated_at": "2026-05-31T12:00:00Z"
  }
]
```

---

## Backend Methods

### Get Settings
```typescript
const settings = await storageService.getSettings();
// Returns: { wallet_address, wallet_address_secondary, payment_instructions }
```

### Update Wallet Address
```typescript
await storageService.updateSetting(
  'wallet_address', 
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'Primary Bitcoin/Crypto wallet address for receiving customs charges'
);
```

### Update Payment Instructions
```typescript
await storageService.updateSetting(
  'payment_instructions',
  'Please send payment to the wallet address above.',
  'Custom payment instructions for customers'
);
```

---

## Testing Wallet Configuration

### Test with Demo Page
Visit: `http://localhost:3000/#/payment-demo`

This demonstrates:
- QR code generation from wallet address
- How wallet appears to customers
- Payment workflow visualization

### Test Real Shipment Flow
1. Create a shipment via Ship page
2. Go to Admin → Edit shipment
3. Mark as "In Customs" and set customs charge
4. Visit tracking page for shipment
5. **PaymentWidget displays with your configured wallet**
6. Verify customer sees QR code and wallet address

---

## Troubleshooting

### Problem: "Failed to load settings"
**Solution:** Check Supabase connection and ensure `settings` table exists

### Problem: Wallet Address Not Appearing
**Solution:** 
- Refresh page
- Check browser console for errors
- Verify wallet_address is saved in `settings` table

### Problem: QR Code Shows "Loading..."
**Solution:**
- Ensure wallet address is at least 20 characters
- Check for invalid characters in address
- QR code requires valid wallet address format

---

## Security Notes

✓ **Wallet address is PUBLIC** - it's displayed to customers, no security risk
✓ **Payment instructions are PUBLIC** - only operational guidance
✓ **Secondary wallet is PRIVATE** - stored but not displayed to customers
✓ All settings changes are **logged with timestamp**
✓ Only **admins** can modify payment settings

---

## Next Steps

1. **Get Supabase Credentials** - Your project URL & anon key
2. **Create Admin User** - In Supabase auth with role 'ADMIN'
3. **Log into Admin Panel** - Use your credentials
4. **Click 💰 Settings** - Configure wallet address
5. **Test Payment Flow** - Visit `/payment-demo` to see it in action

**Questions?** Check the Payment System Implementation guide in `/memories/repo/payment_system_implementation.md`
