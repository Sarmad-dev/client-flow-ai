import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface DeliverabilityMetrics {
  totalSent: number;
  delivered: number;
  bounced: number;
  hardBounces: number;
  softBounces: number;
  spamComplaints: number;
  deliveryRate: number;
  bounceRate: number;
  spamRate: number;
}

export interface DailyDeliverabilityTrend {
  date: string;
  sent: number;
  delivered: number;
  bounced: number;
  hardBounces: number;
  softBounces: number;
  spamComplaints: number;
}

export interface BounceDetail {
  id: string;
  email: string;
  bounceType: 'hard' | 'soft';
  reason: string | null;
  occurredAt: string;
  emailSubject: string | null;
}

/**
 * Hook to fetch overall email statistics including deliverability metrics
 */
export function useEmailStats(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['email-stats', user?.id, dateRange?.start, dateRange?.end],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('email_communications')
        .select(
          'status, opened_at, clicked_at, replied_at, created_at, direction'
        )
        .eq('user_id', user.id)
        .eq('direction', 'sent');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = data?.length ?? 0;
      const delivered =
        data?.filter(
          (d) =>
            d.status === 'delivered' ||
            d.status === 'opened' ||
            d.status === 'clicked'
        )?.length ?? 0;
      const opened = data?.filter((d) => !!d.opened_at)?.length ?? 0;
      const clicked = data?.filter((d) => !!d.clicked_at)?.length ?? 0;
      const replied = data?.filter((d) => !!d.replied_at)?.length ?? 0;

      return {
        total,
        delivered,
        opened,
        clicked,
        replied,
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
        replyRate: delivered > 0 ? (replied / delivered) * 100 : 0,
      };
    },
  });
}

/**
 * Hook to fetch detailed deliverability metrics including bounce and spam rates
 */
export function useDeliverabilityMetrics(dateRange?: {
  start: Date;
  end: Date;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'deliverability-metrics',
      user?.id,
      dateRange?.start,
      dateRange?.end,
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch email communications
      let emailQuery = supabase
        .from('email_communications')
        .select('id, status, created_at, recipient_email, subject')
        .eq('user_id', user.id)
        .eq('direction', 'sent');

      if (dateRange) {
        emailQuery = emailQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: emails, error: emailError } = await emailQuery;
      if (emailError) throw emailError;

      // Fetch email events for bounce details
      let eventsQuery = supabase
        .from('email_events')
        .select('event_type, occurred_at, metadata, email_communication_id')
        .eq('user_id', user.id)
        .in('event_type', ['failed', 'complained']);

      if (dateRange) {
        eventsQuery = eventsQuery
          .gte('occurred_at', dateRange.start.toISOString())
          .lte('occurred_at', dateRange.end.toISOString());
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      const totalSent = emails?.length ?? 0;
      const delivered =
        emails?.filter(
          (e) =>
            e.status === 'delivered' ||
            e.status === 'opened' ||
            e.status === 'clicked'
        )?.length ?? 0;
      const bounced = emails?.filter((e) => e.status === 'failed')?.length ?? 0;
      const spamComplaints =
        emails?.filter((e) => e.status === 'complained')?.length ?? 0;

      // Count hard vs soft bounces from events metadata
      const bounceEvents =
        events?.filter((e) => e.event_type === 'failed') ?? [];
      let hardBounces = 0;
      let softBounces = 0;

      for (const event of bounceEvents) {
        const metadata = event.metadata as any;
        const bounceClassification = metadata?.bounce_classification;
        if (bounceClassification === 'hard') {
          hardBounces++;
        } else if (bounceClassification === 'soft') {
          softBounces++;
        } else {
          // If no classification, count as soft bounce
          softBounces++;
        }
      }

      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
      const spamRate = totalSent > 0 ? (spamComplaints / totalSent) * 100 : 0;

      const metrics: DeliverabilityMetrics = {
        totalSent,
        delivered,
        bounced,
        hardBounces,
        softBounces,
        spamComplaints,
        deliveryRate,
        bounceRate,
        spamRate,
      };

      return metrics;
    },
  });
}

/**
 * Hook to fetch daily deliverability trends for charting
 */
export function useDeliverabilityTrends(start: Date, end: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'deliverability-trends',
      user?.id,
      start.toISOString(),
      end.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as DailyDeliverabilityTrend[];

      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // Fetch emails
      const { data: emails, error: emailError } = await supabase
        .from('email_communications')
        .select('id, status, created_at')
        .eq('user_id', user.id)
        .eq('direction', 'sent')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (emailError) throw emailError;

      // Fetch bounce events for classification
      const { data: events, error: eventsError } = await supabase
        .from('email_events')
        .select('event_type, occurred_at, metadata, email_communication_id')
        .eq('user_id', user.id)
        .eq('event_type', 'failed')
        .gte('occurred_at', startIso)
        .lte('occurred_at', endIso);

      if (eventsError) throw eventsError;

      // Create a map of email_communication_id to bounce classification
      const bounceClassificationMap = new Map<string, 'hard' | 'soft'>();
      for (const event of events ?? []) {
        const metadata = event.metadata as any;
        const classification = metadata?.bounce_classification;
        if (event.email_communication_id) {
          bounceClassificationMap.set(
            event.email_communication_id,
            classification === 'hard' ? 'hard' : 'soft'
          );
        }
      }

      const dayKey = (d: Date) => d.toISOString().slice(0, 10);
      const days: Record<string, DailyDeliverabilityTrend> = {};

      // Initialize buckets for each day in range
      for (
        let dt = new Date(
          start.getFullYear(),
          start.getMonth(),
          start.getDate()
        );
        dt <= end;
        dt = new Date(dt.getTime() + 24 * 60 * 60 * 1000)
      ) {
        const k = dayKey(dt);
        days[k] = {
          date: k,
          sent: 0,
          delivered: 0,
          bounced: 0,
          hardBounces: 0,
          softBounces: 0,
          spamComplaints: 0,
        };
      }

      // Aggregate data by day
      for (const email of emails ?? []) {
        const createdDate = new Date(email.created_at);
        const k = dayKey(createdDate);

        if (days[k]) {
          days[k].sent += 1;

          if (
            email.status === 'delivered' ||
            email.status === 'opened' ||
            email.status === 'clicked'
          ) {
            days[k].delivered += 1;
          } else if (email.status === 'failed') {
            days[k].bounced += 1;
            const classification = bounceClassificationMap.get(email.id);
            if (classification === 'hard') {
              days[k].hardBounces += 1;
            } else {
              days[k].softBounces += 1;
            }
          } else if (email.status === 'complained') {
            days[k].spamComplaints += 1;
          }
        }
      }

      return Object.values(days);
    },
  });
}

/**
 * Hook to fetch detailed bounce information
 */
export function useBounceDetails(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['bounce-details', user?.id, dateRange?.start, dateRange?.end],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as BounceDetail[];

      // Fetch failed emails with events
      let emailQuery = supabase
        .from('email_communications')
        .select('id, recipient_email, subject, created_at')
        .eq('user_id', user.id)
        .eq('direction', 'sent')
        .eq('status', 'failed');

      if (dateRange) {
        emailQuery = emailQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: emails, error: emailError } = await emailQuery;
      if (emailError) throw emailError;

      if (!emails || emails.length === 0) return [];

      // Fetch corresponding events
      const emailIds = emails.map((e) => e.id);
      const { data: events, error: eventsError } = await supabase
        .from('email_events')
        .select('email_communication_id, occurred_at, metadata')
        .eq('user_id', user.id)
        .eq('event_type', 'failed')
        .in('email_communication_id', emailIds);

      if (eventsError) throw eventsError;

      // Create event map
      const eventMap = new Map<string, any>();
      for (const event of events ?? []) {
        if (event.email_communication_id) {
          eventMap.set(event.email_communication_id, event);
        }
      }

      // Combine data
      const bounceDetails: BounceDetail[] = emails.map((email) => {
        const event = eventMap.get(email.id);
        const metadata = event?.metadata as any;
        const bounceClassification = metadata?.bounce_classification;
        const reason = metadata?.reason || metadata?.response || null;

        return {
          id: email.id,
          email: email.recipient_email || '',
          bounceType: bounceClassification === 'hard' ? 'hard' : 'soft',
          reason,
          occurredAt: event?.occurred_at || email.created_at,
          emailSubject: email.subject,
        };
      });

      return bounceDetails;
    },
  });
}
