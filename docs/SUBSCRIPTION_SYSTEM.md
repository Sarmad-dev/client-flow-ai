# Comprehensive Subscription System with RevenueCat

## Overview

NexaSuit now features a comprehensive subscription system powered by RevenueCat, offering four tiers: Free, Basic, Pro, and Enterprise. The system includes usage tracking, feature gating, analytics, and seamless integration with iOS App Store and Google Play Store.

## Architecture

### Components

1. **SubscriptionContext** (`contexts/SubscriptionContext.v2.tsx`)

   - Manages subscription state globally
   - Integrates with RevenueCat SDK
   - Syncs with Supabase database
   - Provides feature access checks
   - Tracks usage metrics

2. **Subscription Configuration** (`lib/subscriptionConfig.ts`)

   - Defines subscription tiers and limits
   - Feature catalog
   - RevenueCat product identifiers
   - Helper functions

3. **Subscription Utilities** (`lib/subscriptionUtils.ts`)

   - Usage calculations
   - Limit checking
   - Analytics generation
   - Prorated pricing calculations

4. **Usage Hook** (`hooks/useSubscriptionUsage.ts`)

   - Convenient usage tracking
   - Automatic upgrade prompts
   - Feature access validation

5. **Webhook Handler** (`supabase/functions/revenuecat-webhook/index.ts`)
   - Processes RevenueCat events
   - Syncs subscription state
   - Logs subscription changes

## Subscription Tiers

### Free Plan

- **Price**: $0
- **Limits**:
  - 5 Leads
  - 3 Clients
  - 5 Tasks per Client
  - 10 Emails per Client
  - 5 Emails per Lead
  - 500MB Storage
- **Features**: Basic CRM functionality

### Basic Plan

- **Price**: $9.99/month or $99.99/year (17% savings)
- **Trial**: 14 days
- **Limits**:
  - 50 Leads
  - 25 Clients
  - 20 Tasks per Client
  - 50 Emails per Client/Lead
  - Up to 3 Team Members
  - 5 Automation Rules
  - 10 Email Templates
  - 5GB Storage
- **Features**:
  - Meeting Management
  - Basic Analytics
  - AI Suggestions
  - Custom Fields

### Pro Plan (Most Popular)

- **Price**: $29.99/month or $299.99/year (17% savings)
- **Trial**: 14 days
- **Limits**:
  - 500 Leads
  - 250 Clients
  - Unlimited Tasks
  - Unlimited Emails
  - Up to 10 Team Members
  - 25 Automation Rules
  - 50 Email Templates
  - 50GB Storage
- **Features**:
  - Everything in Basic
  - Advanced Analytics & Reports
  - Custom Branding
  - Priority Support
  - API Access
  - Bulk Operations
  - Webhooks

### Enterprise Plan

- **Price**: $99.99/month or $999.99/year (17% savings)
- **Trial**: 30 days
- **Limits**: Unlimited everything
- **Features**:
  - Everything in Pro
  - Dedicated Account Manager
  - Custom Integrations
  - Advanced Security
  - SLA Guarantee
  - Custom Training
  - White-label Options

## Setup Instructions

### 1. RevenueCat Configuration

#### Create RevenueCat Account

1. Sign up at [RevenueCat](https://www.revenuecat.com/)
2. Create a new project
3. Get your API keys (iOS and Android)

#### Configure Products

In RevenueCat dashboard:

1. Go to Products
2. Create products matching these identifiers:
   - `nexasuit_basic_monthly`
   - `nexasuit_basic_yearly`
   - `nexasuit_pro_monthly`
   - `nexasuit_pro_yearly`
   - `nexasuit_enterprise_monthly`
   - `nexasuit_enterprise_yearly`

#### Configure Entitlements

Create entitlements:

- `basic` - Attach basic products
- `pro` - Attach pro products
- `enterprise` - Attach enterprise products

### 2. Environment Variables

Add to `.env`:

```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. App Store Connect / Google Play Console

#### iOS (App Store Connect)

1. Create in-app purchases (auto-renewable subscriptions)
2. Use the same product identifiers as RevenueCat
3. Set up subscription groups
4. Configure pricing for each tier

#### Android (Google Play Console)

1. Create subscriptions
2. Use the same product identifiers as RevenueCat
3. Configure pricing for each tier
4. Set up base plans and offers

### 4. Database Migration

Run the enhanced subscription migration:

```bash
npx supabase migration up
```

This creates:

- Enhanced `subscriptions` table
- `subscription_usage_events` table
- `subscription_history` table
- `subscription_promo_codes` table
- `subscription_promo_redemptions` table

### 5. Webhook Setup

#### Deploy Webhook Function

```bash
npx supabase functions deploy revenuecat-webhook
```

#### Configure in RevenueCat

1. Go to RevenueCat Dashboard → Integrations → Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/revenuecat-webhook`
3. Add authorization header with your service role key
4. Enable events:
   - Initial Purchase
   - Renewal
   - Cancellation
   - Expiration
   - Product Change
   - Billing Issue

### 6. Update App Layout

Replace the old SubscriptionContext with the new one in `app/_layout.tsx`:

```typescript
import { SubscriptionProvider } from '@/contexts/SubscriptionContext.v2';
```

Replace the subscription screen:

```bash
# Backup old screen
mv app/(tabs)/subscription.tsx app/(tabs)/subscription.old.tsx

# Use new screen
mv app/(tabs)/subscription.v2.tsx app/(tabs)/subscription.tsx
```

## Usage Examples

### Check Feature Access

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { canAccessMeetings, canAccessAI } = useSubscription();

  if (!canAccessMeetings()) {
    return <UpgradePrompt feature="Meetings" />;
  }

  // Render meetings UI
}
```

### Track Usage

```typescript
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';

function CreateLeadButton() {
  const { checkAndIncrementLeads } = useSubscriptionUsage();

  const handleCreateLead = async () => {
    const canCreate = await checkAndIncrementLeads();
    if (!canCreate) return; // User will see upgrade prompt

    // Create lead
    await createLead(leadData);
  };

  return <Button onPress={handleCreateLead}>Create Lead</Button>;
}
```

### Display Usage Analytics

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function UsageWidget() {
  const { analytics } = useSubscription();

  return (
    <View>
      <Text>Leads: {analytics.usagePercentage.leads}%</Text>
      <Text>Clients: {analytics.usagePercentage.clients}%</Text>
      {analytics.recommendedUpgrade && (
        <Text>Consider upgrading to {analytics.recommendedUpgrade}</Text>
      )}
    </View>
  );
}
```

### Purchase Subscription

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function UpgradeButton() {
  const { offerings, purchasePackage } = useSubscription();

  const handleUpgrade = async () => {
    const pkg = offerings?.current?.availablePackages.find(
      (p) => p.product.identifier === 'nexasuit_pro_monthly'
    );

    if (pkg) {
      const success = await purchasePackage(pkg);
      if (success) {
        Alert.alert('Success', 'Welcome to Pro!');
      }
    }
  };

  return <Button onPress={handleUpgrade}>Upgrade to Pro</Button>;
}
```

## Feature Gating Examples

### In Components

```typescript
// Disable feature for free users
const { canAccessAnalytics } = useSubscription();

<Button disabled={!canAccessAnalytics()} onPress={openAnalytics}>
  View Analytics
</Button>;
```

### In Hooks

```typescript
// In useLeads.ts
const { canCreateLead, incrementUsage } = useSubscription();

const createLead = async (data) => {
  if (!canCreateLead()) {
    throw new Error('Lead limit reached');
  }

  const lead = await supabase.from('leads').insert(data);
  await incrementUsage('leads');
  return lead;
};
```

### In Database (RLS)

```sql
-- Example: Limit leads based on subscription
create policy "users_can_insert_leads_within_limit"
on leads for insert
with check (
  auth.uid() = user_id AND
  check_subscription_limit(auth.uid(), 'leads', (
    select count(*) from leads where user_id = auth.uid()
  ))
);
```

## Testing

### Test Mode

RevenueCat automatically detects sandbox purchases. Test with:

- iOS: Use sandbox Apple ID
- Android: Use test account in Google Play Console

### Test Scenarios

1. **Free Trial**: Start trial, verify access, check expiration
2. **Purchase**: Complete purchase, verify entitlements
3. **Upgrade**: Upgrade from Basic to Pro, verify prorated pricing
4. **Downgrade**: Downgrade from Pro to Basic, verify at period end
5. **Cancellation**: Cancel subscription, verify access until expiration
6. **Restore**: Delete app, reinstall, restore purchases
7. **Webhook**: Trigger events, verify database sync

## Monitoring

### RevenueCat Dashboard

- Active subscriptions
- Revenue metrics
- Churn rate
- Trial conversions

### Supabase Dashboard

- Query `subscriptions` table
- Check `subscription_history` for changes
- Monitor `subscription_usage_events` for patterns

### Analytics Queries

```sql
-- Active subscribers by plan
SELECT plan, COUNT(*)
FROM subscriptions
WHERE is_active = true
GROUP BY plan;

-- Recent upgrades
SELECT * FROM subscription_history
WHERE change_type = 'upgrade'
ORDER BY created_at DESC
LIMIT 10;

-- Usage patterns
SELECT event_type, COUNT(*)
FROM subscription_usage_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

## Troubleshooting

### Purchases Not Syncing

1. Check RevenueCat API keys in environment variables
2. Verify product identifiers match exactly
3. Check webhook is receiving events
4. Review Supabase function logs

### Feature Access Issues

1. Verify subscription status in database
2. Check entitlements in RevenueCat
3. Ensure limits are configured correctly
4. Review RLS policies

### Webhook Failures

1. Check Supabase function logs
2. Verify webhook secret
3. Test webhook manually with curl
4. Check RevenueCat webhook logs

## Best Practices

1. **Always check limits before operations**

   ```typescript
   if (!canCreateLead()) {
     showUpgradePrompt();
     return;
   }
   ```

2. **Sync usage regularly**

   ```typescript
   useEffect(() => {
     syncUsageWithDatabase();
   }, []);
   ```

3. **Handle offline gracefully**

   ```typescript
   try {
     await checkSubscriptionStatus();
   } catch (error) {
     // Use cached subscription data
   }
   ```

4. **Provide clear upgrade paths**

   - Show what features are locked
   - Display current usage vs limits
   - Highlight benefits of upgrading

5. **Test thoroughly**
   - Test all subscription flows
   - Verify feature gating
   - Check edge cases (expired, cancelled, etc.)

## Future Enhancements

- [ ] Promotional codes UI
- [ ] Referral program
- [ ] Usage-based billing
- [ ] Custom enterprise pricing
- [ ] Subscription gifting
- [ ] Family sharing
- [ ] Lifetime purchases
- [ ] Add-on purchases (extra storage, etc.)

## Support

For issues or questions:

- RevenueCat: https://docs.revenuecat.com/
- Supabase: https://supabase.com/docs
- NexaSuit: Contact your development team
