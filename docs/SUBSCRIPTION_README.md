# 💎 NexaSuit Subscription System

> A comprehensive, production-ready subscription system powered by RevenueCat

## 🌟 Features

- **4 Subscription Tiers**: Free, Basic, Pro, and Enterprise
- **Usage Tracking**: Real-time monitoring of leads, clients, tasks, emails, and more
- **Feature Gating**: Granular control over 20+ features
- **Analytics Dashboard**: Usage insights and upgrade recommendations
- **Trial Periods**: 14-30 day trials for paid plans
- **Flexible Billing**: Monthly and yearly options with savings
- **Seamless Payments**: iOS App Store and Google Play integration
- **Webhook Integration**: Real-time sync with RevenueCat
- **Offline Support**: Works without internet connection
- **Promotional Codes**: Support for discounts and special offers

## 🚀 Quick Start

### 1. Install Dependencies

Already installed! RevenueCat is in `package.json`.

### 2. Set Environment Variables

```bash
# Add to .env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Run Migration

```bash
npx supabase migration up
```

### 4. Update App

```typescript
// In app/_layout.tsx
import { SubscriptionProvider } from '@/contexts/SubscriptionContext.v2';
```

### 5. Deploy Webhook

```bash
npx supabase functions deploy revenuecat-webhook
```

**That's it!** See [Quick Start Guide](./SUBSCRIPTION_QUICK_START.md) for details.

## 📊 Subscription Tiers

| Plan           | Price     | Leads | Clients | Key Features              |
| -------------- | --------- | ----- | ------- | ------------------------- |
| **Free**       | $0        | 5     | 3       | Basic CRM                 |
| **Basic**      | $9.99/mo  | 50    | 25      | Meetings, Analytics, AI   |
| **Pro** ⭐     | $29.99/mo | 500   | 250     | API, Automation, Branding |
| **Enterprise** | $99.99/mo | ∞     | ∞       | Everything + Support      |

_Save 17% with yearly billing_

## 💻 Usage Examples

### Check Feature Access

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { canAccessMeetings } = useSubscription();

  if (!canAccessMeetings()) {
    return <UpgradePrompt />;
  }

  return <MeetingsView />;
}
```

### Track Usage

```typescript
import { useSubscriptionUsage } from '@/hooks/useSubscriptionUsage';

function CreateLeadButton() {
  const { checkAndIncrementLeads } = useSubscriptionUsage();

  const handleCreate = async () => {
    const allowed = await checkAndIncrementLeads();
    if (!allowed) return; // Upgrade prompt shown

    await createLead(data);
  };

  return <Button onPress={handleCreate}>Create Lead</Button>;
}
```

### Display Analytics

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function UsageWidget() {
  const { analytics, userSubscription } = useSubscription();

  return (
    <View>
      <Text>Leads: {userSubscription.currentUsage.leads}</Text>
      <Text>Usage: {analytics?.usagePercentage.leads}%</Text>
      {analytics?.recommendedUpgrade && (
        <Text>Consider upgrading to {analytics.recommendedUpgrade}</Text>
      )}
    </View>
  );
}
```

## 📚 Documentation

- **[Quick Start Guide](./SUBSCRIPTION_QUICK_START.md)** - Get started in 5 minutes
- **[Full Documentation](./SUBSCRIPTION_SYSTEM.md)** - Complete reference
- **[Migration Guide](./SUBSCRIPTION_MIGRATION_GUIDE.md)** - Upgrade from old system
- **[Implementation Summary](./SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md)** - What was built

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Mobile App                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         SubscriptionContext                      │  │
│  │  - Feature checks                                │  │
│  │  - Usage tracking                                │  │
│  │  - Analytics                                     │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │         RevenueCat SDK                           │  │
│  │  - Purchase handling                             │  │
│  │  - Receipt validation                            │  │
│  │  - Entitlement management                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  RevenueCat Cloud                       │
│  - Receipt validation                                   │
│  - Webhook events                                       │
│  - Analytics                                            │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Webhook Handler (Edge Function)                 │  │
│  │  - Process events                                │  │
│  │  - Update database                               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                             │  │
│  │  - subscriptions                                 │  │
│  │  - subscription_usage_events                     │  │
│  │  - subscription_history                          │  │
│  │  - subscription_promo_codes                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🔑 Key Components

### Context Provider

`contexts/SubscriptionContext.v2.tsx`

- Global subscription state
- Feature access checks
- Usage tracking
- RevenueCat integration

### Configuration

`lib/subscriptionConfig.ts`

- Tier definitions
- Feature limits
- Product identifiers

### Utilities

`lib/subscriptionUtils.ts`

- Usage calculations
- Analytics generation
- Pricing helpers

### Custom Hook

`hooks/useSubscriptionUsage.ts`

- Convenient usage tracking
- Automatic upgrade prompts

### Webhook Handler

`supabase/functions/revenuecat-webhook/index.ts`

- Process RevenueCat events
- Sync subscription state

### UI Components

`app/(tabs)/subscription.v2.tsx`

- Beautiful subscription screen
- All tiers displayed
- Usage analytics

## 🎯 Feature Access Methods

```typescript
const subscription = useSubscription();

// Core Features
subscription.canCreateLead();
subscription.canCreateClient();
subscription.canCreateTask();
subscription.canSendEmail();

// Premium Features
subscription.canAccessMeetings();
subscription.canAccessAnalytics();
subscription.canAccessAI();
subscription.canAccessAutomation();

// Advanced Features
subscription.canAccessAPI();
subscription.canAccessCustomBranding();
subscription.canAccessAdvancedReports();
subscription.canPerformBulkOperations();
subscription.canUseCustomFields();
subscription.canUseWebhooks();

// Team Features
subscription.canAddTeamMember();
```

## 📈 Analytics & Monitoring

### Usage Analytics

```typescript
const { analytics } = useSubscription();

// Usage percentages
analytics.usagePercentage.leads; // 0-100
analytics.usagePercentage.clients; // 0-100
analytics.usagePercentage.emails; // 0-100

// Recommendations
analytics.recommendedUpgrade; // 'basic' | 'pro' | 'enterprise'
analytics.daysUntilRenewal; // number
```

### Database Queries

```sql
-- Active subscribers
SELECT plan, COUNT(*) FROM subscriptions
WHERE is_active = true GROUP BY plan;

-- Revenue by plan
SELECT plan, billing_period, COUNT(*)
FROM subscriptions WHERE is_active = true
GROUP BY plan, billing_period;

-- Recent changes
SELECT * FROM subscription_history
ORDER BY created_at DESC LIMIT 10;

-- Usage patterns
SELECT event_type, COUNT(*)
FROM subscription_usage_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;
```

## 🧪 Testing

### Sandbox Testing

```typescript
// iOS: Use sandbox Apple ID
// Android: Use test account

// Test purchase
const pkg = offerings?.current?.availablePackages[0];
await purchasePackage(pkg);

// Test restore
await restorePurchases();

// Test limits
for (let i = 0; i < 10; i++) {
  const allowed = await checkAndIncrementLeads();
  console.log(`Lead ${i + 1}: ${allowed ? 'Created' : 'Blocked'}`);
}
```

## 🔒 Security

- ✅ Row Level Security (RLS) enabled
- ✅ Server-side limit validation
- ✅ Webhook signature verification
- ✅ Secure API key storage
- ✅ User-scoped data access
- ✅ Encrypted sensitive data

## 🐛 Troubleshooting

### Purchases Not Working

1. Check API keys in `.env`
2. Verify product identifiers match
3. Test with sandbox account
4. Check RevenueCat dashboard

### Features Not Unlocking

1. Check subscription status
2. Verify entitlements
3. Sync with database
4. Check RLS policies

### Webhook Issues

1. Check function logs
2. Verify webhook URL
3. Test authorization
4. Review RevenueCat logs

See [Full Documentation](./SUBSCRIPTION_SYSTEM.md#troubleshooting) for more.

## 📞 Support

- **Documentation**: See `docs/` folder
- **RevenueCat**: https://docs.revenuecat.com/
- **Supabase**: https://supabase.com/docs
- **Issues**: Contact development team

## 🎉 What's Included

- ✅ 4 subscription tiers
- ✅ 20+ feature checks
- ✅ Usage tracking system
- ✅ Analytics dashboard
- ✅ Webhook integration
- ✅ Database schema
- ✅ UI components
- ✅ Custom hooks
- ✅ Comprehensive docs
- ✅ Testing scenarios
- ✅ Security best practices

## 🚀 Next Steps

1. **Configure RevenueCat**

   - Create account
   - Set up products
   - Configure entitlements

2. **Set Up Stores**

   - App Store Connect (iOS)
   - Google Play Console (Android)

3. **Deploy**

   - Run migration
   - Deploy webhook
   - Update environment variables

4. **Test**

   - Test purchase flows
   - Verify feature gating
   - Check analytics

5. **Launch**
   - Monitor metrics
   - Optimize pricing
   - Track conversions

## 💡 Pro Tips

- Start with generous free tier to attract users
- Offer trials to increase conversions
- Show value clearly in upgrade prompts
- Track which limits users hit most
- A/B test pricing and features
- Monitor churn and optimize

## 📊 Success Metrics

Track these KPIs:

- Free → Paid conversion rate
- Trial → Paid conversion rate
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Churn rate
- Lifetime Value (LTV)

## 🔮 Roadmap

Future enhancements:

- [ ] Promotional codes UI
- [ ] Referral program
- [ ] Usage-based billing
- [ ] Custom enterprise pricing
- [ ] Subscription gifting
- [ ] Family sharing
- [ ] Lifetime purchases
- [ ] Add-on purchases

---

**Built with ❤️ for NexaSuit**

Ready to monetize your app! 🚀💰
