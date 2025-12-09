# Migration Guide: Old to New Subscription System

## Overview

This guide helps you migrate from the basic subscription system to the comprehensive RevenueCat-powered system with multiple tiers, usage tracking, and advanced features.

## What's New

### Features Added

- ✅ 4 subscription tiers (was 2)
- ✅ Comprehensive usage tracking
- ✅ Analytics dashboard
- ✅ Trial period support
- ✅ Webhook integration
- ✅ Subscription history tracking
- ✅ Promotional codes support
- ✅ Better offline support
- ✅ Prorated upgrades/downgrades
- ✅ Enhanced feature gating

### Breaking Changes

- `SubscriptionPlan` type now includes 'basic' and 'enterprise'
- `UserSubscription` interface has new fields
- `SubscriptionLimits` interface expanded with more features
- Context API methods updated

## Step-by-Step Migration

### 1. Backup Current Implementation

```bash
# Backup current files
cp contexts/SubscriptionContext.tsx contexts/SubscriptionContext.old.tsx
cp types/subscription.ts types/subscription.old.ts
cp app/(tabs)/subscription.tsx app/(tabs)/subscription.old.tsx
```

### 2. Update Type Definitions

The new `types/subscription.ts` is already updated. Key changes:

```typescript
// OLD
export type SubscriptionPlan = 'free' | 'pro';

// NEW
export type SubscriptionPlan = 'free' | 'basic' | 'pro' | 'enterprise';

// OLD
export interface SubscriptionLimits {
  maxLeads: number;
  maxClients: number;
  maxTasksPerClient: number;
  maxEmailsPerClient: number;
  maxEmailsPerLead: number;
  meetingsEnabled: boolean;
  analyticsEnabled: boolean;
}

// NEW - Many more fields
export interface SubscriptionLimits {
  maxLeads: number;
  maxClients: number;
  maxTasksPerClient: number;
  maxEmailsPerClient: number;
  maxEmailsPerLead: number;
  maxTeamMembers: number;
  maxAutomationRules: number;
  maxEmailTemplates: number;
  maxStorageGB: number;
  meetingsEnabled: boolean;
  analyticsEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  customBrandingEnabled: boolean;
  prioritySupportEnabled: boolean;
  apiAccessEnabled: boolean;
  advancedReportsEnabled: boolean;
  bulkOperationsEnabled: boolean;
  customFieldsEnabled: boolean;
  webhooksEnabled: boolean;
}
```

### 3. Update Context Provider

Replace the import in `app/_layout.tsx`:

```typescript
// OLD
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

// NEW
import { SubscriptionProvider } from '@/contexts/SubscriptionContext.v2';
```

Or rename the files:

```bash
mv contexts/SubscriptionContext.tsx contexts/SubscriptionContext.old.tsx
mv contexts/SubscriptionContext.v2.tsx contexts/SubscriptionContext.tsx
```

### 4. Update Database Schema

Run the new migration:

```bash
npx supabase migration up
```

This will:

- Add new columns to `subscriptions` table
- Create `subscription_usage_events` table
- Create `subscription_history` table
- Create `subscription_promo_codes` table
- Create `subscription_promo_redemptions` table
- Add helpful database functions

### 5. Migrate Existing Subscription Data

Run this SQL to update existing subscriptions:

```sql
-- Update existing 'pro' users to keep their plan
-- Free users stay as 'free'
UPDATE subscriptions
SET
  status = CASE WHEN is_active THEN 'active' ELSE 'expired' END,
  will_renew = is_active,
  billing_period = 'monthly' -- Default, update as needed
WHERE plan IN ('free', 'pro');

-- Optionally, migrate some pro users to basic if appropriate
-- UPDATE subscriptions SET plan = 'basic' WHERE plan = 'pro' AND <some_condition>;
```

### 6. Update Component Usage

#### Old Way

```typescript
// OLD
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { canCreateLead, incrementUsage } = useSubscription();

  const handleCreate = async () => {
    if (!canCreateLead()) {
      Alert.alert('Limit Reached', 'Upgrade to create more leads');
      return;
    }
    await createLead(data);
    await incrementUsage('leads');
  };
}
```

#### New Way

```typescript
// NEW - Using the convenience hook
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';

function MyComponent() {
  const { checkAndIncrementLeads } = useSubscriptionUsage();

  const handleCreate = async () => {
    const allowed = await checkAndIncrementLeads();
    if (!allowed) return; // Upgrade prompt shown automatically

    await createLead(data);
  };
}
```

### 7. Update Feature Checks

#### Old Way

```typescript
// OLD
const { canAccessMeetings } = useSubscription();

if (!canAccessMeetings()) {
  return <LockedFeature />;
}
```

#### New Way (Same API, More Features)

```typescript
// NEW - Same API, but more checks available
const {
  canAccessMeetings,
  canAccessAI,
  canAccessAutomation,
  canAccessAPI,
  canAccessCustomBranding,
  canAccessAdvancedReports,
  canPerformBulkOperations,
  canUseCustomFields,
  canUseWebhooks,
} = useSubscription();

if (!canAccessMeetings()) {
  return <LockedFeature />;
}
```

### 8. Update Subscription Screen

Replace the subscription screen:

```bash
mv app/(tabs)/subscription.tsx app/(tabs)/subscription.old.tsx
mv app/(tabs)/subscription.v2.tsx app/(tabs)/subscription.tsx
```

The new screen includes:

- All 4 tiers displayed
- Usage analytics
- Billing period toggle (monthly/yearly)
- Trial information
- Better visual design

### 9. Update Purchase Flow

#### Old Way

```typescript
// OLD
const { purchaseSubscription } = useSubscription();

await purchaseSubscription(packageId);
```

#### New Way

```typescript
// NEW - More flexible
const { purchasePackage, offerings } = useSubscription();

const pkg = offerings?.current?.availablePackages.find(
  (p) => p.product.identifier === 'nexasuit_pro_monthly'
);

if (pkg) {
  await purchasePackage(pkg);
}

// Or use the convenience method
const { changePlan } = useSubscription();
await changePlan('pro', 'monthly');
```

### 10. Add Usage Tracking

Add usage tracking throughout your app:

```typescript
// In your create/delete operations
import { useSubscription } from '@/contexts/SubscriptionContext';

const { incrementUsage, decrementUsage, trackUsageEvent } = useSubscription();

// When creating
await incrementUsage('leads');
await trackUsageEvent({
  userId: user.id,
  eventType: 'lead_created',
  timestamp: new Date(),
  metadata: { leadId: newLead.id },
});

// When deleting
await decrementUsage('leads');
```

### 11. Update Environment Variables

Add new environment variables:

```bash
# Add to .env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

### 12. Deploy Webhook Handler

```bash
npx supabase functions deploy revenuecat-webhook
```

Configure in RevenueCat dashboard:

- URL: `https://your-project.supabase.co/functions/v1/revenuecat-webhook`
- Authorization: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`

## Testing Migration

### 1. Test Existing Users

```typescript
// Verify existing subscriptions still work
const { userSubscription } = useSubscription();
console.log('Current plan:', userSubscription.plan);
console.log('Is active:', userSubscription.isActive);
console.log('Usage:', userSubscription.currentUsage);
```

### 2. Test New Features

```typescript
// Test new feature checks
const subscription = useSubscription();
console.log('Can access AI:', subscription.canAccessAI());
console.log('Can access automation:', subscription.canAccessAutomation());
console.log('Can access API:', subscription.canAccessAPI());
```

### 3. Test Usage Tracking

```typescript
// Test usage increment/decrement
await incrementUsage('leads');
console.log('Leads after increment:', userSubscription.currentUsage.leads);

await decrementUsage('leads');
console.log('Leads after decrement:', userSubscription.currentUsage.leads);
```

### 4. Test Analytics

```typescript
// Test analytics generation
const { analytics } = useSubscription();
console.log('Usage percentages:', analytics?.usagePercentage);
console.log('Recommended upgrade:', analytics?.recommendedUpgrade);
```

## Rollback Plan

If you need to rollback:

```bash
# Restore old files
mv contexts/SubscriptionContext.old.tsx contexts/SubscriptionContext.tsx
mv types/subscription.old.ts types/subscription.ts
mv app/(tabs)/subscription.old.tsx app/(tabs)/subscription.tsx

# Rollback database (if needed)
npx supabase db reset
```

## Common Migration Issues

### Issue: Type Errors

**Problem**: TypeScript errors about missing properties

**Solution**: Update all `SubscriptionPlan` and `SubscriptionLimits` references

```typescript
// Update type guards
if (plan === 'pro' || plan === 'basic' || plan === 'enterprise') {
  // Has premium features
}
```

### Issue: Usage Not Syncing

**Problem**: Usage counts don't match database

**Solution**: Call `syncUsageWithDatabase()`

```typescript
const { syncUsageWithDatabase } = useSubscription();

useEffect(() => {
  syncUsageWithDatabase();
}, []);
```

### Issue: Webhook Not Working

**Problem**: Subscription changes not syncing from RevenueCat

**Solution**:

1. Check webhook URL is correct
2. Verify authorization header
3. Check Supabase function logs
4. Test webhook manually

### Issue: Old Subscriptions Not Recognized

**Problem**: Existing pro users showing as free

**Solution**: Run migration SQL to update status field

```sql
UPDATE subscriptions
SET status = 'active'
WHERE is_active = true AND status IS NULL;
```

## Post-Migration Checklist

- [ ] All existing users can access their features
- [ ] New subscription tiers are available
- [ ] Usage tracking is working
- [ ] Analytics are displaying correctly
- [ ] Webhook is receiving events
- [ ] Purchase flow works for all tiers
- [ ] Restore purchases works
- [ ] Trial periods are functioning
- [ ] Upgrade/downgrade flows work
- [ ] Feature gating is enforced
- [ ] Database is syncing correctly
- [ ] Error handling is working
- [ ] Offline mode works
- [ ] UI displays correctly
- [ ] Documentation is updated

## Support

If you encounter issues during migration:

1. Check the full documentation: `docs/SUBSCRIPTION_SYSTEM.md`
2. Review the quick start guide: `docs/SUBSCRIPTION_QUICK_START.md`
3. Check Supabase logs for errors
4. Review RevenueCat dashboard for sync issues
5. Contact the development team

## Timeline

Recommended migration timeline:

- **Day 1**: Backup and prepare
- **Day 2**: Update code and database
- **Day 3**: Test in development
- **Day 4**: Test in staging
- **Day 5**: Deploy to production
- **Day 6-7**: Monitor and fix issues

## Success Metrics

Track these metrics post-migration:

- Subscription conversion rate
- Trial-to-paid conversion
- Upgrade rate (free → paid)
- Churn rate
- Average revenue per user (ARPU)
- Feature usage by tier
- Support tickets related to subscriptions

---

Good luck with your migration! 🚀
