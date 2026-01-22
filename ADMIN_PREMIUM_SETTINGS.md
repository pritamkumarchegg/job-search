# Admin Premium Settings - Complete Guide

## Overview

The new Admin Settings interface provides comprehensive control over premium features, including configurable lock settings, manual premium access, and real-time dashboard updates.

## ✨ New Features

### 1. Premium Lock Settings

**What it does:**
- Control whether free users can apply to jobs
- When enabled: Free users can apply **once per rolling window**
- When disabled: Free users can apply **unlimited times**

**How to configure:**
1. Go to Admin → Settings
2. Scroll to **"Premium Lock Settings"** section
3. Toggle **"Enable Premium Lock"** on/off
4. If enabled, select rolling window period: **2, 5, 15, or 30 days**
5. Click **"Save Changes"**

**Real-time effect:**
- Changes apply immediately to all free users
- Dashboard reflects new restrictions instantly
- No page refresh needed

### 2. Configurable Rolling Window Days

**Default:** 15 days

**Options available:**
- 2 days (shortest - most restrictive)
- 5 days
- 15 days (default)
- 30 days (most lenient)

**Or custom value:**
- Enter any number from 1-365 days

**How it works:**
- Tracks user actions in a **rolling window** (not calendar-based)
- Example: If user applies on Jan 15, they can apply again on Jan 30 (15-day window)
- Window resets automatically 15 days after first action

### 3. Manual Premium Access

**What it does:**
- Grant permanent premium access to specific users **without payment**
- Bypass the usual payment/payment verification process
- Users get unlimited apply actions

**How to add a user:**
1. Go to Admin → Settings
2. Scroll to **"Manual Premium Access"** section
3. Enter user's **email address**
4. Click **"Add User"**
5. User gets instant premium access
6. Click **"Save Changes"**

**How to remove a user:**
1. Find user in the **"Users with Manual Premium Access"** list
2. Click the **"Remove"** button next to their email
3. User reverts to free tier
4. Click **"Save Changes"**

**Features:**
- Supports multiple emails in one settings
- Automatic tier upgrade when adding user
- Real-time effect (no logout needed)
- Searchable/scrollable list if many users

### 4. AI Minimum Match Score

**What it does:**
- Set minimum job match score threshold
- Only jobs ≥ threshold score shown to users

**Options:**
- 60, 70 (default), 80, 90% or custom value
- Adjust with slider or preset buttons

### 5. Mobile Responsive Admin Interface

**All sections optimized for:**
- ✅ Desktop (full width)
- ✅ Tablet (2-column on larger screens)
- ✅ Mobile (single column, touch-friendly buttons)

**Features:**
- Collapsible cards with better spacing
- Larger tap targets for mobile
- Responsive flex layouts
- Sticky save button at bottom

## 📊 How Settings Flow to Users

```
Admin saves settings in database
         ↓
Settings fetched by backend service
         ↓
Applied to permission checks
         ↓
Free user attempts to apply job
         ↓
Backend checks:
  1. Is premium lock enabled? (from admin setting)
  2. Is user tier = premium? (allow)
  3. Is user in manual premium list? (allow)
  4. Count actions in rolling window (from setting)
  5. Allow if under limit
         ↓
Tooltip updates in real-time with remaining days
```

## 🔧 Backend Implementation

### API Endpoints

**Get all settings:**
```
GET /api/admin/settings
```

**Get specific setting:**
```
GET /api/admin/settings/:key
```

**Update setting:**
```
PUT /api/admin/settings/:key
Body: { value, type, description }
```

**Grant manual premium:**
```
POST /api/admin/grant-premium
Body: { email }
Response: { success, user: { id, email, tier } }
```

**Revoke manual premium:**
```
POST /api/admin/revoke-premium
Body: { email }
```

### Database Storage

Settings stored in `AdminSettings` collection:

```javascript
{
  key: "premium_lock_enabled",
  value: true,
  type: "boolean",
  description: "Enable/disable premium lock for free users",
  updatedBy: ObjectId,
  updatedAt: Date
}
```

**Key names:**
- `premium_lock_enabled` (boolean)
- `premium_lock_days` (number)
- `manual_premium_users` (array of emails)
- `ai_minimum_score` (number)

### Service Layer

**File:** `/backend/src/services/usageTrackingService.ts`

Key functions that read from settings:
- `getRollingWindowDays()` - Fetches from admin setting
- `isPremiumLockEnabled()` - Checks toggle status
- `isManualPremiumUser(email)` - Checks email in list
- `checkActionPermission()` - Uses all above settings

## 🎨 Frontend UI Sections

### Settings Page Structure

1. **General Settings** (gray header)
   - App name, URL, maintenance mode

2. **AI Job Matching Settings** (blue section)
   - Minimum score threshold (60, 70, 80, 90%)

3. **Premium Lock Settings** (purple section - NEW)
   - Enable/Disable toggle
   - Days selector (2, 5, 15, 30, custom)
   - Real-time preview

4. **Manual Premium Access** (green section - NEW)
   - Email input + Add button
   - List of users with premium access
   - Remove buttons with trash icon

5. **Notification Settings** (gray)
   - Email, SMS, Daily reports toggles

6. **Publishing Settings** (gray)
   - Auto-publish toggle

7. **API Keys & Security** (gray)
   - API key management

## 📱 Mobile Responsiveness

**Breakpoints:**
- Mobile: < 768px (single column, full-width buttons)
- Tablet: 768px - 1024px (flexible layout)
- Desktop: > 1024px (multi-column, side-by-side)

**Elements adjusted:**
- Cards with responsive padding (p-4 md:p-6)
- Buttons: Full width on mobile, auto width on desktop
- Labels: Smaller text on mobile (text-xs md:text-sm)
- Input fields: Full width on mobile
- Flex layouts: Flex-col on mobile, flex-row on desktop

**Sticky save button:**
- Fixed at bottom on mobile for easy access
- Normal position on desktop

## 🔐 Security & Permissions

### Required Permissions
- All admin settings endpoints require: `authenticateToken` + `requireRole('admin')`
- Only admin users can:
  - View settings
  - Update settings
  - Grant/revoke manual premium
  - Change lock status/days

### Data Validation
- Email validation on manual premium input
- Number range validation (1-365 days)
- Type checking (boolean, number, string, json)

## 🚀 Real-Time Updates

When admin changes settings:

1. **API Call** - `PUT /api/admin/settings/:key`
2. **Database Save** - AdminSettings collection updated
3. **Real-time Publish** - Event published to `realtime:admin_settings`
4. **Client Update** - Connected clients receive event (via Socket.io)
5. **Service Reload** - `usageTrackingService` fetches latest settings
6. **Permission Update** - Next permission check uses new settings

**No cache:** Settings checked fresh for each user action

## ✅ Testing Admin Settings

### Test Premium Lock Toggle

**Scenario:** Disable lock, user applies unlimited times
1. Go to Admin → Settings
2. Uncheck **"Enable Premium Lock"**
3. Save Changes
4. Log in as free user
5. Try applying to 5 different jobs
6. All should work (no "apply limit" message)
7. Re-enable lock, test again (should show tooltip after 1st apply)

### Test Configurable Days

**Scenario:** Change window from 15 to 2 days
1. Go to Admin → Settings
2. Select **"2d"** for rolling window
3. Save Changes
4. Free user applies to 1 job (uses limit)
5. Try applying to another job (blocked - shows "Next: [date+2]")
6. Change back to 15 days
7. Next permission check uses new 15-day window

### Test Manual Premium Access

**Scenario:** Grant premium to specific user without payment
1. Get a free user's email (e.g., "user@example.com")
2. Go to Admin → Settings
3. Enter email in "Add User to Premium" field
4. Click "Add User"
5. Log in as that user
6. Apply to jobs → No limit (works unlimited times)
7. Remove from list, save
8. User reverts to free tier (1 apply per window)

## 🎯 Common Use Cases

### Use Case 1: Free Trial for 30 Days
1. Enable premium lock
2. Set days to 30
3. Users get 1 free apply per month

### Use Case 2: Generous Free Tier
1. Enable premium lock
2. Set days to 2
3. Users get 1 free apply every 2 days

### Use Case 3: Unlimited Free Access
1. Disable premium lock
2. All free users can apply unlimited times
3. Still get premium features (priority support, etc.)

### Use Case 4: VIP Users
1. Keep premium lock enabled
2. Manually add important partner companies' employees
3. They get premium access without paying
4. Dashboard shows them in "Manual Premium Users" list

## 📊 Dashboard Impact

All changes reflect immediately in:
- **Dashboard** - Matched jobs count
- **All Jobs Page** - Apply restrictions
- **Jobs Page** - Apply button availability
- **Job Detail Page** - Apply button status
- **User Profile** - Usage stats

**No cache invalidation needed** - Uses fresh database queries

## 🐛 Troubleshooting

### Settings not saving
- Check admin role
- Check network connection
- Check browser console for errors
- Try clearing cache and reload

### Premium lock not working
- Check if "Enable Premium Lock" is toggled ON
- Check user tier (must be "free" not "premium")
- Check if user is in manual premium list
- Verify settings were saved (check success message)

### Manual premium not granting access
- Verify email spelling (case-insensitive)
- Check user exists in database
- Try refreshing page after adding
- Check backend logs

## 📝 API Response Examples

### Grant Premium Success
```json
{
  "success": true,
  "message": "user@example.com granted premium access",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "tier": "premium"
  }
}
```

### Check Settings Response
```json
{
  "premium_lock_enabled": true,
  "premium_lock_days": 15,
  "manual_premium_users": ["user1@example.com", "user2@example.com"],
  "ai_minimum_score": 70
}
```

## 🔄 Settings Lifecycle

1. **Create** - Admin enters new value, saves
2. **Store** - Saved to AdminSettings collection
3. **Fetch** - Service reads from DB on next action
4. **Apply** - Used in permission checks
5. **Update** - Admin changes value, saves again
6. **Effect** - Immediately applied to new permission checks
7. **Delete** - Admin can remove setting (revert to default)

## 🎓 Learning Resources

- Settings stored in MongoDB: `AdminSettings` collection
- Service layer: `/backend/src/services/usageTrackingService.ts`
- Controller: `/backend/src/controllers/adminSettingsController.ts`
- Routes: `/backend/src/routes/admin.ts`
- Frontend: `/frontend/src/pages/admin/AdminSettings.tsx`
- Models: `/backend/src/models/AdminSettings.ts`

---

**Last Updated:** January 22, 2026
**Status:** ✅ Production Ready
