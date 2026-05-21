# 🚨 Critical Fixes Required Before Production

## Immediate Action Required

### 1. Security: Move Hardcoded Credentials to Environment Variables

**File**: `services/storage.ts`

**Current (INSECURE)**:
```typescript
const SUPABASE_URL = 'https://btbibhexfeuwksqusakn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Fix**:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://btbibhexfeuwksqusakn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
```

**File**: `vite.config.ts`

**Current (INSECURE)**:
```typescript
'process.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY || 're_SMf2oHpR_8H9JTSQLiYK7XJh9ERwAUBkT')
```

**Fix**:
```typescript
'process.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY)
// Remove the hardcoded fallback - fail gracefully if missing
```

### 2. Create Environment Variables File

Create `.env.local` in project root:
```
VITE_SUPABASE_URL=https://btbibhexfeuwksqusakn.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_key_here
GEMINI_API_KEY=your_gemini_key_here
RESEND_API_KEY=your_resend_key_here
```

**Note**: `.env.local` is already in `.gitignore` - never commit this file!

### 3. Update Vite Config for Environment Variables

**File**: `vite.config.ts`

Update the `define` section:
```typescript
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY),
  // Add Supabase variables
  'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
  'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
}
```

### 4. Verify .htaccess File

The `.htaccess` file has been created. Ensure it's uploaded to your web server root when deploying.

## Testing After Fixes

1. ✅ Verify `.env.local` is not tracked by git: `git status` should not show it
2. ✅ Test that app works with environment variables
3. ✅ Verify no credentials appear in build output: `grep -r "btbibhexfeuwksqusakn" dist/`
4. ✅ Test deployment with environment variables only

## Priority Order

1. **🔴 CRITICAL**: Fix hardcoded credentials (items 1-3)
2. **🟡 HIGH**: Verify .htaccess works on server
3. **🟢 MEDIUM**: Review other recommendations in PROJECT_REVIEW.md

---

**After completing these fixes, your application will be production-ready!**

