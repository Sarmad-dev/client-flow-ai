# RevenueCat Setup Guide

This guide will help you set up RevenueCat for the subscription system in your React Native app.

## 1. RevenueCat Dashboard Setup

### Create Account

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Create a new account or sign in
3. Create a new project for your app

### Configure Products

1. In your RevenueCat dashboard, go to **Products**
2. Create a new product with ID: `pro_monthly`
3. Set the product type to **Subscription**
4. Configure the pricing:
   - Base price: $5.00 USD
   - Billing period: Monthly
   - Currency: USD (RevenueCat will automatically show local currency to users)

### Configure Entitlements

1. Go to **Entitlements**
2. Create a new entitlement called `pro`
3. Add the `pro_monthly` product to this entitlement
4. Set the entitlement to grant access to all pro features

### Get API Keys

1. Go to **Project Settings** > **API Keys**
2. Copy your **Public API Key** (starts with `appl_`)

## 2. App Store Connect Setup

### Create In-App Purchase

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Select your app
3. Go to **Features** > **In-App Purchases**
4. Create a new **Auto-Renewable Subscription**
5. Set the product ID to: `pro_monthly`
6. Configure pricing tiers and localizations
7. Submit for review

## 3. Google Play Console Setup

### Create Subscription Product

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Monetize** > **Products** > **Subscriptions**
4. Create a new subscription with ID: `pro_monthly`
5. Set the base price to $5.00 USD
6. Configure pricing for different countries
7. Submit for review

## 4. Update Your App

### Replace API Key

In `contexts/SubscriptionContext.tsx`, replace the placeholder API key:

```typescript
await Purchases.configure({ apiKey: 'YOUR_REVENUECAT_API_KEY' });
```

Replace `YOUR_REVENUECAT_API_KEY` with your actual RevenueCat public API key.

### Configure App Store IDs

If you have different product IDs for iOS and Android, update the purchase logic:

```typescript
const purchaseSubscription = async (packageId: string): Promise<boolean> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage({
      identifier: packageId,
    });
    const isPro = customerInfo.entitlements.active['pro'] !== undefined;

    if (isPro) {
      // Update subscription state
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to purchase subscription:', error);
    return false;
  }
};
```

## 5. Testing

### TestFlight/Internal Testing

1. Upload your app to TestFlight (iOS) or Internal Testing (Android)
2. Add test users to your RevenueCat project
3. Test the subscription flow with test accounts

### Sandbox Testing

- iOS: Use sandbox Apple IDs
- Android: Use test accounts in Google Play Console

## 6. Production Deployment

### App Store

1. Ensure your in-app purchase is approved
2. Submit your app for review
3. Make sure the subscription product is live

### Google Play

1. Ensure your subscription is approved
2. Submit your app for review
3. Activate the subscription in production

## 7. Usage Examples

### Check Subscription Status

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

const { userSubscription } = useSubscription();
console.log('Current plan:', userSubscription.plan);
```

### Guard Pro Features

```typescript
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';

const { guardLeadCreation } = useSubscriptionGuard();

const handleCreateLead = () => {
  if (guardLeadCreation()) {
    // User can create lead
    createLead();
  }
  // Modal will automatically show if user doesn't have access
};
```

### Show Subscription Modal

```typescript
import { SubscriptionModal } from '@/components/SubscriptionModal';

<SubscriptionModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  featureName="Lead Creation"
/>;
```

## 8. Troubleshooting

### Common Issues

1. **API Key Error**: Ensure you're using the correct public API key
2. **Product Not Found**: Verify product IDs match between RevenueCat and app stores
3. **Purchase Fails**: Check that products are approved and live in app stores
4. **Restore Not Working**: Ensure users are signed in to their app store accounts

### Debug Mode

Enable debug logging in development:

```typescript
await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
```

## 9. Analytics and Monitoring

### RevenueCat Dashboard

- Monitor subscription metrics
- Track conversion rates
- View revenue analytics
- Monitor churn rates

### Webhooks

Set up webhooks in RevenueCat to sync subscription status with your backend.

## 10. Legal Requirements

### Privacy Policy

Ensure your privacy policy covers:

- Subscription terms
- Auto-renewal information
- Cancellation process
- Data collection for subscriptions

### Terms of Service

Include subscription terms in your app's terms of service.

## Support

For additional help:

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Support](https://www.revenuecat.com/support/)
- [React Native Purchases SDK](https://github.com/RevenueCat/react-native-purchases)
