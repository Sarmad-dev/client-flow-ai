// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    store: string;
    environment: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id?: string;
    original_transaction_id?: string;
    is_trial_period?: boolean;
    price?: number;
    currency?: string;
  };
  api_version: string;
}

serve(async (req) => {
  try {
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('X-RevenueCat-Signature');
      if (!signature) {
        return new Response('Unauthorized', { status: 401 });
      }
      // TODO: Implement signature verification
    }

    const payload: RevenueCatEvent = await req.json();
    const { event } = payload;

    console.log('RevenueCat webhook received:', event.type);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map RevenueCat event to subscription data
    const subscriptionData = await processEvent(event, supabase);

    if (subscriptionData) {
      // Update subscription in database
      const { error } = await supabase
        .from('subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error updating subscription:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Log subscription change
      if (event.type !== 'INITIAL_PURCHASE') {
        await logSubscriptionChange(supabase, subscriptionData, event.type);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function processEvent(event: any, supabase: any) {
  const userId = await getUserIdFromAppUserId(supabase, event.app_user_id);
  if (!userId) {
    console.error('User not found for app_user_id:', event.app_user_id);
    return null;
  }

  const plan = determinePlan(event.entitlement_ids || []);
  const status = determineStatus(event);
  const billingPeriod = determineBillingPeriod(event.period_type);

  const subscriptionData: any = {
    user_id: userId,
    plan,
    status,
    is_active: status === 'active' || status === 'trial',
    billing_period: billingPeriod,
    rc_entitlement: event.entitlement_ids?.[0] || null,
    rc_original_app_user_id: event.app_user_id,
    rc_platform: event.store === 'APP_STORE' ? 'ios' : 'android',
    rc_product_identifier: event.product_id,
    rc_period_type: event.period_type,
    rc_is_sandbox: event.environment === 'SANDBOX',
  };

  // Handle different event types
  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
      subscriptionData.expires_at = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;
      subscriptionData.will_renew = true;
      subscriptionData.cancelled_at = null;

      if (event.is_trial_period) {
        subscriptionData.status = 'trial';
        subscriptionData.trial_ends_at = event.expiration_at_ms
          ? new Date(event.expiration_at_ms).toISOString()
          : null;
      }
      break;

    case 'CANCELLATION':
      subscriptionData.cancelled_at = new Date().toISOString();
      subscriptionData.will_renew = false;
      // Keep active until expiration
      subscriptionData.is_active = true;
      break;

    case 'UNCANCELLATION':
      subscriptionData.cancelled_at = null;
      subscriptionData.will_renew = true;
      break;

    case 'NON_RENEWING_PURCHASE':
      subscriptionData.will_renew = false;
      subscriptionData.expires_at = event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : null;
      break;

    case 'EXPIRATION':
      subscriptionData.status = 'expired';
      subscriptionData.is_active = false;
      subscriptionData.will_renew = false;
      break;

    case 'BILLING_ISSUE':
      subscriptionData.status = 'grace_period';
      break;

    case 'SUBSCRIBER_ALIAS':
      // Handle user ID changes
      break;

    default:
      console.log('Unhandled event type:', event.type);
  }

  return subscriptionData;
}

async function getUserIdFromAppUserId(supabase: any, appUserId: string) {
  // Try to find user by matching app_user_id in subscriptions table
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('rc_original_app_user_id', appUserId)
    .maybeSingle();

  if (subscription) {
    return subscription.user_id;
  }

  // If not found, try to parse UUID from app_user_id (if you use user_id as app_user_id)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(appUserId)) {
    return appUserId;
  }

  return null;
}

function determinePlan(entitlementIds: string[]): string {
  if (entitlementIds.includes('enterprise')) return 'enterprise';
  if (entitlementIds.includes('pro')) return 'pro';
  if (entitlementIds.includes('basic')) return 'basic';
  return 'free';
}

function determineStatus(event: any): string {
  if (event.is_trial_period) return 'trial';
  if (event.type === 'EXPIRATION') return 'expired';
  if (event.type === 'CANCELLATION') return 'cancelled';
  if (event.type === 'BILLING_ISSUE') return 'grace_period';
  return 'active';
}

function determineBillingPeriod(periodType: string): string | null {
  if (periodType === 'NORMAL') return 'monthly';
  if (periodType === 'ANNUAL') return 'yearly';
  return null;
}

async function logSubscriptionChange(
  supabase: any,
  subscriptionData: any,
  eventType: string
) {
  // Get previous plan
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', subscriptionData.user_id)
    .maybeSingle();

  if (currentSub && currentSub.plan !== subscriptionData.plan) {
    await supabase.from('subscription_history').insert({
      user_id: subscriptionData.user_id,
      from_plan: currentSub.plan,
      to_plan: subscriptionData.plan,
      change_type: determineChangeType(
        eventType,
        currentSub.plan,
        subscriptionData.plan
      ),
      metadata: {
        event_type: eventType,
        product_id: subscriptionData.rc_product_identifier,
      },
    });
  }
}

function determineChangeType(
  eventType: string,
  fromPlan: string,
  toPlan: string
): string {
  if (eventType === 'INITIAL_PURCHASE') return 'trial_start';
  if (eventType === 'CANCELLATION') return 'cancellation';
  if (eventType === 'RENEWAL') return 'renewal';

  const planOrder = ['free', 'basic', 'pro', 'enterprise'];
  const fromIndex = planOrder.indexOf(fromPlan);
  const toIndex = planOrder.indexOf(toPlan);

  return toIndex > fromIndex ? 'upgrade' : 'downgrade';
}
