# Subscription System Implementation Checklist

Use this checklist to ensure complete implementation of the subscription system.

## 📋 Pre-Implementation

- [ ] Review all documentation files
- [ ] Understand subscription tiers and pricing
- [ ] Review RevenueCat documentation
- [ ] Backup existing subscription code
- [ ] Create test Apple ID (iOS)
- [ ] Create test Google account (Android)

## 🔧 RevenueCat Setup

### Account Setup

- [ ] Create RevenueCat account at revenuecat.com
- [ ] Create new project in RevenueCat
- [ ] Note down API keys (iOS and Android)
- [ ] Set up team members (if applicable)

### Product Configuration

- [ ] Create product: `nexasuit_basic_monthly`
- [ ] Create product: `nexasuit_basic_yearly`
- [ ] Create product: `nexasuit_pro_monthly`
- [ ] Create product: `nexasuit_pro_yearly`
- [ ] Create product: `nexasuit_enterprise_monthly`
- [ ] Create product: `nexasuit_enterprise_yearly`

### Entitlement Configuration

- [ ] Create entitlement: `basic`
- [ ] Create entitlement: `pro`
- [ ] Create entitlement: `enterprise`
- [ ] Attach products to correct entitlements
- [ ] Verify entitlement configuration

### Offering Configuration

- [ ] Create default offering
- [ ] Add all packages to offering
- [ ] Set package identifiers
- [ ] Configure package metadata

## 🍎 iOS Setup (App Store Connect)

### App Store Connect

- [ ] Log in to App Store Connect
- [ ] Navigate to your app
- [ ] Go to Features → In-App Purchases
- [ ] Create subscription group

### Create Subscriptions

- [ ] Create: Basic Monthly ($9.99)
- [ ] Create: Basic Yearly ($99.99)
- [ ] Create: Pro Monthly ($29.99)
- [ ] Create: Pro Yearly ($299.99)
- [ ] Create: Enterprise Monthly ($99.99)
- [ ] Create: Enterprise Yearly ($999.99)

### Configure Each Subscription

- [ ] Set product ID (match RevenueCat)
- [ ] Set reference name
- [ ] Add subscription duration
- [ ] Set price
- [ ] Add localized descriptions
- [ ] Add promotional images
- [ ] Set up free trial (14 or 30 days)
- [ ] Configure subscription group
- [ ] Submit for review

### Testing

- [ ] Create sandbox test account
- [ ] Add test account to App Store Connect
- [ ] Test purchase flow
- [ ] Test restore purchases
- [ ] Test subscription management

## 🤖 Android Setup (Google Play Console)

### Google Play Console

- [ ] Log in to Google Play Console
- [ ] Navigate to your app
- [ ] Go to Monetize → Subscriptions

### Create Subscriptions

- [ ] Create: Basic Monthly ($9.99)
- [ ] Create: Basic Yearly ($99.99)
- [ ] Create: Pro Monthly ($29.99)
- [ ] Create: Pro Yearly ($299.99)
- [ ] Create: Enterprise Monthly ($99.99)
- [ ] Create: Enterprise Yearly ($999.99)

### Configure Each Subscription

- [ ] Set product ID (match RevenueCat)
- [ ] Set name and description
- [ ] Create base plan
- [ ] Set billing period
- [ ] Set price
- [ ] Add free trial offer
- [ ] Configure grace period
- [ ] Set up promotional offers
- [ ] Activate subscription

### Testing

- [ ] Add test account in License Testing
- [ ] Configure test purchases
- [ ] Test purchase flow
- [ ] Test restore purchases
- [ ] Test subscription management

## 💾 Database Setup

### Migration

- [ ] Review migration file: `20250908000000_enhanced_subscriptions.sql`
- [ ] Backup existing database
- [ ] Run migration: `npx supabase migration up`
- [ ] Verify tables created:
  - [ ] `subscriptions` (enhanced)
  - [ ] `subscription_usage_events`
  - [ ] `subscription_history`
  - [ ] `subscription_promo_codes`
  - [ ] `subscription_promo_redemptions`
- [ ] Verify triggers created
- [ ] Verify functions created
- [ ] Verify RLS policies active

### Data Migration (if applicable)

- [ ] Export existing subscription data
- [ ] Update plan names (pro → keep as pro)
- [ ] Add status field to existing records
- [ ] Add billing_period to existing records
- [ ] Verify data integrity
- [ ] Test queries on migrated data

## 🔌 Webhook Setup

### Deploy Function

- [ ] Review webhook code
- [ ] Deploy: `npx supabase functions deploy revenuecat-webhook`
- [ ] Note function URL
- [ ] Test function locally (optional)
- [ ] Verify function logs

### Configure in RevenueCat

- [ ] Go to RevenueCat Dashboard → Integrations
- [ ] Click Webhooks
- [ ] Add new webhook
- [ ] Enter URL: `https://your-project.supabase.co/functions/v1/revenuecat-webhook`
- [ ] Add authorization header: `Bearer YOUR_SERVICE_ROLE_KEY`
- [ ] Enable events:
  - [ ] Initial Purchase
  - [ ] Renewal
  - [ ] Cancellation
  - [ ] Expiration
  - [ ] Product Change
  - [ ] Billing Issue
  - [ ] Uncancellation
- [ ] Save webhook
- [ ] Test webhook with sample event

## 📱 Code Integration

### Environment Variables

- [ ] Add to `.env`:
  ```bash
  EXPO_PUBLIC_REVENUECAT_IOS_KEY=xxx
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=xxx
  REVENUECAT_WEBHOOK_SECRET=xxx
  ```
- [ ] Verify variables load correctly
- [ ] Add to `.env.example` (without values)
- [ ] Update `.gitignore` to exclude `.env`

### Update Context Provider

- [ ] Backup old context: `contexts/SubscriptionContext.tsx`
- [ ] Rename new context: `SubscriptionContext.v2.tsx` → `SubscriptionContext.tsx`
- [ ] Or update import in `app/_layout.tsx`
- [ ] Verify context loads without errors
- [ ] Test context methods

### Update Subscription Screen

- [ ] Backup old screen: `app/(tabs)/subscription.tsx`
- [ ] Rename new screen: `subscription.v2.tsx` → `subscription.tsx`
- [ ] Verify screen renders correctly
- [ ] Test all interactive elements
- [ ] Verify styling on both themes

### Add Usage Tracking

- [ ] Import `useSubscriptionUsage` in relevant components
- [ ] Add usage checks before create operations:
  - [ ] Lead creation
  - [ ] Client creation
  - [ ] Task creation
  - [ ] Email sending
  - [ ] Automation rule creation
  - [ ] Template creation
- [ ] Add usage decrement on delete operations
- [ ] Test usage tracking accuracy

### Add Feature Gates

- [ ] Gate meetings feature
- [ ] Gate analytics feature
- [ ] Gate AI suggestions
- [ ] Gate automation features
- [ ] Gate API access
- [ ] Gate custom branding
- [ ] Gate advanced reports
- [ ] Gate bulk operations
- [ ] Gate custom fields
- [ ] Gate webhooks
- [ ] Test all feature gates

## 🧪 Testing

### Unit Tests

- [ ] Test subscription context methods
- [ ] Test usage tracking functions
- [ ] Test limit checking
- [ ] Test analytics generation
- [ ] Test utility functions

### Integration Tests

- [ ] Test RevenueCat SDK initialization
- [ ] Test purchase flow (sandbox)
- [ ] Test restore purchases
- [ ] Test subscription status sync
- [ ] Test webhook processing
- [ ] Test database updates

### User Flow Tests

- [ ] Test free user experience
- [ ] Test upgrade from free to basic
- [ ] Test upgrade from basic to pro
- [ ] Test upgrade from pro to enterprise
- [ ] Test downgrade scenarios
- [ ] Test cancellation flow
- [ ] Test reactivation flow
- [ ] Test trial period
- [ ] Test trial expiration
- [ ] Test subscription expiration

### Feature Gate Tests

- [ ] Test each feature gate
- [ ] Test upgrade prompts
- [ ] Test limit enforcement
- [ ] Test usage tracking
- [ ] Test analytics display

### Edge Cases

- [ ] Test offline mode
- [ ] Test poor network conditions
- [ ] Test simultaneous purchases
- [ ] Test rapid usage increments
- [ ] Test database sync failures
- [ ] Test webhook failures
- [ ] Test expired subscriptions
- [ ] Test cancelled subscriptions

## 📊 Monitoring Setup

### RevenueCat Dashboard

- [ ] Set up dashboard access for team
- [ ] Configure email notifications
- [ ] Set up Slack integration (optional)
- [ ] Review available reports
- [ ] Set up custom charts

### Supabase Monitoring

- [ ] Set up database monitoring
- [ ] Configure function logs
- [ ] Set up error alerts
- [ ] Create custom queries for metrics
- [ ] Set up scheduled reports

### Analytics

- [ ] Track subscription conversions
- [ ] Track trial conversions
- [ ] Track upgrade paths
- [ ] Track churn rate
- [ ] Track revenue metrics
- [ ] Set up cohort analysis

## 📝 Documentation

### Internal Documentation

- [ ] Document setup process
- [ ] Document testing procedures
- [ ] Document troubleshooting steps
- [ ] Document monitoring procedures
- [ ] Create runbook for common issues

### User Documentation

- [ ] Create subscription FAQ
- [ ] Document upgrade process
- [ ] Document cancellation process
- [ ] Document refund policy
- [ ] Create feature comparison chart

## 🚀 Pre-Launch

### Code Review

- [ ] Review all subscription code
- [ ] Review security implementations
- [ ] Review error handling
- [ ] Review user experience
- [ ] Get team approval

### Security Audit

- [ ] Verify RLS policies
- [ ] Verify API key security
- [ ] Verify webhook authentication
- [ ] Verify data encryption
- [ ] Test unauthorized access attempts

### Performance Testing

- [ ] Test with high user load
- [ ] Test database query performance
- [ ] Test webhook processing speed
- [ ] Test UI responsiveness
- [ ] Optimize slow queries

### Legal & Compliance

- [ ] Review terms of service
- [ ] Review privacy policy
- [ ] Review refund policy
- [ ] Ensure GDPR compliance
- [ ] Ensure App Store guidelines compliance
- [ ] Ensure Play Store guidelines compliance

## 🎉 Launch

### Soft Launch

- [ ] Deploy to staging environment
- [ ] Test with beta users
- [ ] Gather feedback
- [ ] Fix critical issues
- [ ] Monitor metrics

### Production Deployment

- [ ] Deploy to production
- [ ] Verify all services running
- [ ] Monitor error logs
- [ ] Monitor purchase success rate
- [ ] Monitor webhook processing
- [ ] Be ready for support requests

### Post-Launch

- [ ] Monitor first 24 hours closely
- [ ] Track conversion rates
- [ ] Gather user feedback
- [ ] Address issues quickly
- [ ] Optimize based on data

## 📈 Optimization

### Week 1

- [ ] Review conversion rates
- [ ] Analyze drop-off points
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Optimize upgrade prompts

### Month 1

- [ ] Analyze subscription metrics
- [ ] Review churn rate
- [ ] Identify popular features
- [ ] A/B test pricing (optional)
- [ ] Optimize trial length
- [ ] Improve onboarding

### Ongoing

- [ ] Monthly metrics review
- [ ] Quarterly pricing review
- [ ] Feature usage analysis
- [ ] Competitor analysis
- [ ] User surveys
- [ ] Continuous optimization

## ✅ Sign-Off

### Development Team

- [ ] Code complete and tested
- [ ] Documentation complete
- [ ] Handoff to QA

### QA Team

- [ ] All tests passed
- [ ] Edge cases verified
- [ ] Performance acceptable
- [ ] Handoff to Product

### Product Team

- [ ] User experience approved
- [ ] Pricing approved
- [ ] Marketing materials ready
- [ ] Ready for launch

### Leadership

- [ ] Business case approved
- [ ] Budget approved
- [ ] Launch timeline approved
- [ ] Go/No-Go decision

---

## 📞 Support Contacts

- **RevenueCat Support**: support@revenuecat.com
- **Supabase Support**: support@supabase.io
- **Development Team**: [Your contact]
- **Product Team**: [Your contact]

## 📚 Resources

- [RevenueCat Docs](https://docs.revenuecat.com/)
- [Supabase Docs](https://supabase.com/docs)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console)
- [Internal Documentation](./SUBSCRIPTION_SYSTEM.md)

---

**Last Updated**: [Date]
**Version**: 1.0
**Status**: Ready for Implementation

🎯 **Goal**: Launch comprehensive subscription system within [timeframe]
