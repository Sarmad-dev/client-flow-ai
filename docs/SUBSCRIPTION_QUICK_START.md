# Subscription System - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Environment Variables

Add to your `.env` file:

```bash
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key_here

# Webhook Secret (optional but recommended)
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 2: Run Database Migration

```bash
npx supabase migration up
```

### Step 3: Update App Layout

In `app/_layout.tsx`, replace the import:

```typescript
// OLD
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

// NEW
import { SubscriptionProvider } from '@/contexts/SubscriptionContext.v2';
```

### Step 4: Replace Subscription Screen

```bash
# Backup old screen
mv app/(tabs)/subscription.tsx app/(tabs)/subscription.old.tsx

# Use new comprehensive screen
mv app/(tabs)/subscription.v2.tsx app/(tabs)/subscription.tsx
```

### Step 5: Deploy Webhook (Optional but Recommended)

```bash
npx supabase functions deploy revenuecat-webhook
```

## ✅ You're Done!

The subscription system is now active with:

- ✅ 4 subscription tiers (Free, Basic, Pro, Enterprise)
- ✅ Usage tracking and limits
- ✅ Feature gating
- ✅ Analytics dashboard
- ✅ Upgrade prompts
- ✅ Trial periods

## 📱 Using in Your Code

### Check if user can create a lead:

```typescript
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';

function CreateLeadButton() {
  const { checkAndIncrementLeads } = useSubscriptionUsage();

  const handleCreate = async () => {
    const allowed = await checkAndIncrementLeads();
    if (!allowed) return; // Upgrade prompt shown automatically

    // Create your lead
    await createLead(data);
  };

  return <Button onPress={handleCreate}>Create Lead</Button>;
}
```

### Check feature access:

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function AnalyticsScreen() {
  const { canAccessAnalytics } = useSubscription();

  if (!canAccessAnalytics()) {
    return <UpgradePrompt feature="Analytics" />;
  }

  return <AnalyticsContent />;
}
```

### Show usage stats:

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function UsageWidget() {
  const { userSubscription, analytics } = useSubscription();

  return (
    <View>
      <Text>Leads: {userSubscription.currentUsage.leads}</Text>
      <Text>Usage: {analytics?.usagePercentage.leads}%</Text>
    </View>
  );
}
```

## 🔧 RevenueCat Setup (Required for Production)

### 1. Create Account

- Go to [revenuecat.com](https://www.revenuecat.com/)
- Create a new project
- Get your API keys

### 2. Configure Products

Create these product identifiers:

- `nexasuit_basic_monthly`
- `nexasuit_basic_yearly`
- `nexasuit_pro_monthly`
- `nexasuit_pro_yearly`
- `nexasuit_enterprise_monthly`
- `nexasuit_enterprise_yearly`

### 3. Configure Entitlements

- `basic` → Attach basic products
- `pro` → Attach pro products
- `enterprise` → Attach enterprise products

### 4. Set Up Webhook

- URL: `https://your-project.supabase.co/functions/v1/revenuecat-webhook`
- Authorization: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
- Events: Enable all subscription events

## 📊 Subscription Tiers

| Feature              | Free      | Basic     | Pro       | Enterprise |
| -------------------- | --------- | --------- | --------- | ---------- |
| **Price**            | $0        | $9.99/mo  | $29.99/mo | $99.99/mo  |
| **Leads**            | 5         | 50        | 500       | Unlimited  |
| **Clients**          | 3         | 25        | 250       | Unlimited  |
| **Tasks**            | 5/client  | 20/client | Unlimited | Unlimited  |
| **Emails**           | 10/client | 50/client | Unlimited | Unlimited  |
| **Meetings**         | ❌        | ✅        | ✅        | ✅         |
| **Analytics**        | ❌        | Basic     | Advanced  | Advanced   |
| **AI Suggestions**   | ❌        | ✅        | ✅        | ✅         |
| **Automation**       | ❌        | 5 rules   | 25 rules  | Unlimited  |
| **Team Members**     | 1         | 3         | 10        | Unlimited  |
| **Storage**          | 500MB     | 5GB       | 50GB      | 500GB      |
| **API Access**       | ❌        | ❌        | ✅        | ✅         |
| **Priority Support** | ❌        | ❌        | ✅        | ✅         |
| **Custom Branding**  | ❌        | ❌        | ✅        | ✅         |

## 🧪 Testing

### Test Purchases

1. iOS: Use sandbox Apple ID
2. Android: Add test account in Google Play Console
3. RevenueCat automatically detects sandbox mode

### Test Scenarios

```typescript
// Test creating leads until limit
for (let i = 0; i < 10; i++) {
  const allowed = await checkAndIncrementLeads();
  console.log(`Lead ${i + 1}: ${allowed ? 'Created' : 'Blocked'}`);
}

// Test feature access
console.log('Can access meetings:', canAccessMeetings());
console.log('Can access AI:', canAccessAI());
console.log('Can access analytics:', canAccessAnalytics());
```

## 📈 Monitoring

### Check Active Subscriptions

```sql
SELECT plan, COUNT(*) as count
FROM subscriptions
WHERE is_active = true
GROUP BY plan;
```

### View Recent Changes

```sql
SELECT *
FROM subscription_history
ORDER BY created_at DESC
LIMIT 10;
```

### Usage Analytics

```sql
SELECT event_type, COUNT(*) as count
FROM subscription_usage_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

## 🆘 Common Issues

### "No packages available"

- Check RevenueCat API keys in `.env`
- Verify products are configured in RevenueCat dashboard
- Ensure product identifiers match exactly

### "Purchase failed"

- Test with sandbox account
- Check App Store Connect / Google Play Console setup
- Verify RevenueCat integration is active

### "Features not unlocking"

- Check subscription status in database
- Verify entitlements in RevenueCat
- Run `syncUsageWithDatabase()` to refresh

## 📚 Full Documentation

See `docs/SUBSCRIPTION_SYSTEM.md` for comprehensive documentation including:

- Detailed architecture
- Advanced usage examples
- Webhook configuration
- Database schema
- Best practices
- Troubleshooting guide

## 🎯 Next Steps

1. **Configure RevenueCat** with your products
2. **Set up App Store Connect / Google Play Console**
3. **Test subscription flows** in sandbox mode
4. **Customize upgrade prompts** to match your brand
5. **Add analytics tracking** for conversion optimization
6. **Monitor usage patterns** to optimize pricing

## 💡 Pro Tips

- **Start with trials**: Offer 14-day trials to increase conversions
- **Show value**: Display what users get with each tier
- **Track usage**: Monitor which limits users hit most often
- **Optimize pricing**: A/B test different price points
- **Communicate clearly**: Show exactly what's included in each plan
- **Make upgrading easy**: One-tap upgrade from any screen

---

Need help? Check the full documentation or contact the development team!
