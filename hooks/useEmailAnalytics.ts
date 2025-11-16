import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailAnalyticsMetrics {
  totalSent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

export interface DailyEngagementMetrics {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
}

export interface HourlyEngagementMetrics {
  hour: number;
  opens: number;
  clicks: number;
  replies: number;
}

export interface DayOfWeekMetrics {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  dayName: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
}

export interface RecipientEngagement {
  email: string;
  displayName: string | null;
  totalEmails: number;
  opens: number;
  clicks: number;
  replies: number;
  engagementScore: number;
  lastInteraction: string | null;
}

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  usageCount: number;
  opens: number;
  clicks: number;
  replies: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

/**
 * Hook to fetch comprehensive email analytics with date range support
 */
export function useEmailAnalytics(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'email-analytics',
      user?.id,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;

      let query = supabase
        .from('email_communications')
        .select('status, opened_at, clicked_at, replied_at, created_at')
        .eq('user_id', user.id)
        .eq('direction', 'sent');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalSent = data?.length ?? 0;
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
      const bounced = data?.filter((d) => d.status === 'failed')?.length ?? 0;

      const metrics: EmailAnalyticsMetrics = {
        totalSent,
        delivered,
        opened,
        clicked,
        replied,
        bounced,
        deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
        clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
        replyRate: delivered > 0 ? (replied / delivered) * 100 : 0,
        bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
      };

      return metrics;
    },
  });
}

/**
 * Hook to fetch time-series engagement data for charts
 */
export function useEmailActivity(start: Date, end: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'email-activity',
      user?.id,
      start.toISOString(),
      end.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as DailyEngagementMetrics[];

      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const { data, error } = await supabase
        .from('email_communications')
        .select('status, created_at, opened_at, clicked_at, replied_at')
        .eq('user_id', user.id)
        .eq('direction', 'sent')
        .gte('created_at', startIso)
        .lte('created_at', endIso);

      if (error) throw error;

      const dayKey = (d: Date) => d.toISOString().slice(0, 10);
      const days: Record<string, DailyEngagementMetrics> = {};

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
          opened: 0,
          clicked: 0,
          replied: 0,
        };
      }

      // Aggregate data by day
      for (const row of data ?? []) {
        const createdDate = new Date(row.created_at);
        const k = dayKey(createdDate);

        if (days[k]) {
          days[k].sent += 1;

          if (
            row.status === 'delivered' ||
            row.status === 'opened' ||
            row.status === 'clicked'
          ) {
            days[k].delivered += 1;
          }

          if (row.opened_at) {
            const openedDate = new Date(row.opened_at);
            const openKey = dayKey(openedDate);
            if (days[openKey]) days[openKey].opened += 1;
          }

          if (row.clicked_at) {
            const clickedDate = new Date(row.clicked_at);
            const clickKey = dayKey(clickedDate);
            if (days[clickKey]) days[clickKey].clicked += 1;
          }

          if (row.replied_at) {
            const repliedDate = new Date(row.replied_at);
            const replyKey = dayKey(repliedDate);
            if (days[replyKey]) days[replyKey].replied += 1;
          }
        }
      }

      return Object.values(days);
    },
  });
}

/**
 * Hook to fetch hour-of-day engagement patterns
 */
export function useHourlyEngagement(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'hourly-engagement',
      user?.id,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as HourlyEngagementMetrics[];

      let query = supabase
        .from('email_communications')
        .select('opened_at, clicked_at, replied_at')
        .eq('user_id', user.id)
        .eq('direction', 'sent');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Initialize hourly buckets (0-23)
      const hours: Record<number, HourlyEngagementMetrics> = {};
      for (let h = 0; h < 24; h++) {
        hours[h] = { hour: h, opens: 0, clicks: 0, replies: 0 };
      }

      // Aggregate by hour
      for (const row of data ?? []) {
        if (row.opened_at) {
          const hour = new Date(row.opened_at).getHours();
          hours[hour].opens += 1;
        }
        if (row.clicked_at) {
          const hour = new Date(row.clicked_at).getHours();
          hours[hour].clicks += 1;
        }
        if (row.replied_at) {
          const hour = new Date(row.replied_at).getHours();
          hours[hour].replies += 1;
        }
      }

      return Object.values(hours);
    },
  });
}

/**
 * Hook to fetch day-of-week engagement patterns
 */
export function useDayOfWeekEngagement(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'day-of-week-engagement',
      user?.id,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as DayOfWeekMetrics[];

      let query = supabase
        .from('email_communications')
        .select('created_at, opened_at, clicked_at, replied_at, status')
        .eq('user_id', user.id)
        .eq('direction', 'sent');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];

      // Initialize day buckets
      const days: Record<number, DayOfWeekMetrics> = {};
      for (let d = 0; d < 7; d++) {
        days[d] = {
          dayOfWeek: d,
          dayName: dayNames[d],
          sent: 0,
          opened: 0,
          clicked: 0,
          replied: 0,
          openRate: 0,
        };
      }

      // Aggregate by day of week
      for (const row of data ?? []) {
        const dayOfWeek = new Date(row.created_at).getDay();
        days[dayOfWeek].sent += 1;

        if (row.opened_at) days[dayOfWeek].opened += 1;
        if (row.clicked_at) days[dayOfWeek].clicked += 1;
        if (row.replied_at) days[dayOfWeek].replied += 1;
      }

      // Calculate open rates
      for (let d = 0; d < 7; d++) {
        if (days[d].sent > 0) {
          days[d].openRate = (days[d].opened / days[d].sent) * 100;
        }
      }

      return Object.values(days);
    },
  });
}

/**
 * Hook to fetch recipient engagement rankings
 */
export function useRecipientEngagement(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'recipient-engagement',
      user?.id,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as RecipientEngagement[];

      // Fetch emails
      let emailQuery = supabase
        .from('email_communications')
        .select(
          'recipient_email, opened_at, clicked_at, replied_at, created_at, client_id, lead_id'
        )
        .eq('user_id', user.id)
        .eq('direction', 'sent');

      if (dateRange) {
        emailQuery = emailQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: emails, error: emailError } = await emailQuery;
      if (emailError) throw emailError;

      // Fetch client and lead names
      const [clientsRes, leadsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, email, name')
          .eq('user_id', user.id),
        supabase.from('leads').select('id, email, name').eq('user_id', user.id),
      ]);

      if (clientsRes.error) throw clientsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      // Create name lookup maps
      const nameByEmail = new Map<string, string>();
      for (const c of clientsRes.data ?? []) {
        if (c.email) nameByEmail.set(c.email.toLowerCase(), c.name);
      }
      for (const l of leadsRes.data ?? []) {
        if (l.email && !nameByEmail.has(l.email.toLowerCase())) {
          nameByEmail.set(l.email.toLowerCase(), l.name);
        }
      }

      // Aggregate by recipient
      const recipientMap = new Map<
        string,
        {
          totalEmails: number;
          opens: number;
          clicks: number;
          replies: number;
          lastInteraction: Date | null;
        }
      >();

      for (const email of emails ?? []) {
        if (!email.recipient_email) continue;

        const recipientKey = email.recipient_email.toLowerCase();
        if (!recipientMap.has(recipientKey)) {
          recipientMap.set(recipientKey, {
            totalEmails: 0,
            opens: 0,
            clicks: 0,
            replies: 0,
            lastInteraction: null,
          });
        }

        const stats = recipientMap.get(recipientKey)!;
        stats.totalEmails += 1;

        if (email.opened_at) {
          stats.opens += 1;
          const openDate = new Date(email.opened_at);
          if (!stats.lastInteraction || openDate > stats.lastInteraction) {
            stats.lastInteraction = openDate;
          }
        }

        if (email.clicked_at) {
          stats.clicks += 1;
          const clickDate = new Date(email.clicked_at);
          if (!stats.lastInteraction || clickDate > stats.lastInteraction) {
            stats.lastInteraction = clickDate;
          }
        }

        if (email.replied_at) {
          stats.replies += 1;
          const replyDate = new Date(email.replied_at);
          if (!stats.lastInteraction || replyDate > stats.lastInteraction) {
            stats.lastInteraction = replyDate;
          }
        }
      }

      // Convert to array and calculate engagement scores
      const recipients: RecipientEngagement[] = [];
      for (const [email, stats] of recipientMap.entries()) {
        // Engagement score: weighted sum of interactions
        const engagementScore =
          stats.opens * 1 + stats.clicks * 2 + stats.replies * 3;

        recipients.push({
          email,
          displayName: nameByEmail.get(email) ?? null,
          totalEmails: stats.totalEmails,
          opens: stats.opens,
          clicks: stats.clicks,
          replies: stats.replies,
          engagementScore,
          lastInteraction: stats.lastInteraction?.toISOString() ?? null,
        });
      }

      // Sort by engagement score descending
      recipients.sort((a, b) => b.engagementScore - a.engagementScore);

      return recipients;
    },
  });
}

/**
 * Hook to fetch template performance metrics
 */
export function useTemplatePerformance(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      'template-performance',
      user?.id,
      dateRange?.start?.toISOString(),
      dateRange?.end?.toISOString(),
    ],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as TemplatePerformance[];

      // Fetch templates
      const { data: templates, error: templateError } = await supabase
        .from('email_templates')
        .select('id, name')
        .eq('user_id', user.id);

      if (templateError) throw templateError;

      // Fetch emails with template usage
      let emailQuery = supabase
        .from('email_communications')
        .select('template_id, opened_at, clicked_at, replied_at, status')
        .eq('user_id', user.id)
        .eq('direction', 'sent')
        .not('template_id', 'is', null);

      if (dateRange) {
        emailQuery = emailQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: emails, error: emailError } = await emailQuery;
      if (emailError) throw emailError;

      // Create template name lookup
      const templateNameMap = new Map<string, string>();
      for (const template of templates ?? []) {
        templateNameMap.set(template.id, template.name);
      }

      // Aggregate by template
      const templateStats = new Map<
        string,
        {
          usageCount: number;
          opens: number;
          clicks: number;
          replies: number;
          delivered: number;
        }
      >();

      for (const email of emails ?? []) {
        if (!email.template_id) continue;

        if (!templateStats.has(email.template_id)) {
          templateStats.set(email.template_id, {
            usageCount: 0,
            opens: 0,
            clicks: 0,
            replies: 0,
            delivered: 0,
          });
        }

        const stats = templateStats.get(email.template_id)!;
        stats.usageCount += 1;

        if (
          email.status === 'delivered' ||
          email.status === 'opened' ||
          email.status === 'clicked'
        ) {
          stats.delivered += 1;
        }

        if (email.opened_at) stats.opens += 1;
        if (email.clicked_at) stats.clicks += 1;
        if (email.replied_at) stats.replies += 1;
      }

      // Convert to array with calculated rates
      const performance: TemplatePerformance[] = [];
      for (const [templateId, stats] of templateStats.entries()) {
        const templateName =
          templateNameMap.get(templateId) ?? 'Unknown Template';

        performance.push({
          templateId,
          templateName,
          usageCount: stats.usageCount,
          opens: stats.opens,
          clicks: stats.clicks,
          replies: stats.replies,
          openRate:
            stats.delivered > 0 ? (stats.opens / stats.delivered) * 100 : 0,
          clickRate:
            stats.delivered > 0 ? (stats.clicks / stats.delivered) * 100 : 0,
          replyRate:
            stats.delivered > 0 ? (stats.replies / stats.delivered) * 100 : 0,
        });
      }

      // Sort by usage count descending
      performance.sort((a, b) => b.usageCount - a.usageCount);

      return performance;
    },
  });
}
