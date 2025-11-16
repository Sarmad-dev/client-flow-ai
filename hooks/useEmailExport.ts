import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Platform, Share } from 'react-native';

export interface ExportOptions {
  dateRange?: { start: Date; end: Date };
  includeMetrics?: boolean;
  includeEvents?: boolean;
  format?: 'csv' | 'json';
}

/**
 * Hook to export email communications data to CSV or JSON
 */
export function useExportEmailData() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (options: ExportOptions = {}) => {
      if (!user?.id) throw new Error('User not authenticated');

      const {
        dateRange,
        includeMetrics = true,
        includeEvents = false,
        format = 'csv',
      } = options;

      // Fetch email communications
      let query = supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: emails, error: emailError } = await query;
      if (emailError) throw emailError;

      if (!emails || emails.length === 0) {
        throw new Error('No email data to export');
      }

      // Fetch events if requested
      let eventsMap = new Map<string, any[]>();
      if (includeEvents) {
        const emailIds = emails.map((e) => e.id);
        const { data: events, error: eventsError } = await supabase
          .from('email_events')
          .select('*')
          .eq('user_id', user.id)
          .in('email_communication_id', emailIds);

        if (eventsError) throw eventsError;

        // Group events by email_communication_id
        for (const event of events ?? []) {
          if (!eventsMap.has(event.email_communication_id)) {
            eventsMap.set(event.email_communication_id, []);
          }
          eventsMap.get(event.email_communication_id)!.push(event);
        }
      }

      // Generate export content
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        // JSON export
        const exportData = emails.map((email) => ({
          id: email.id,
          direction: email.direction,
          sender_email: email.sender_email,
          recipient_email: email.recipient_email,
          subject: email.subject,
          status: email.status,
          created_at: email.created_at,
          opened_at: email.opened_at,
          clicked_at: email.clicked_at,
          replied_at: email.replied_at,
          ...(includeMetrics && {
            was_opened: !!email.opened_at,
            was_clicked: !!email.clicked_at,
            was_replied: !!email.replied_at,
          }),
          ...(includeEvents && {
            events: eventsMap.get(email.id) || [],
          }),
        }));

        content = JSON.stringify(exportData, null, 2);
        filename = `email-export-${
          new Date().toISOString().split('T')[0]
        }.json`;
        mimeType = 'application/json';
      } else {
        // CSV export
        const headers = [
          'ID',
          'Direction',
          'Sender',
          'Recipient',
          'Subject',
          'Status',
          'Created At',
          'Opened At',
          'Clicked At',
          'Replied At',
        ];

        if (includeMetrics) {
          headers.push('Was Opened', 'Was Clicked', 'Was Replied');
        }

        const rows = emails.map((email) => {
          const row = [
            email.id,
            email.direction,
            email.sender_email || '',
            email.recipient_email || '',
            `"${(email.subject || '').replace(/"/g, '""')}"`, // Escape quotes
            email.status || '',
            email.created_at,
            email.opened_at || '',
            email.clicked_at || '',
            email.replied_at || '',
          ];

          if (includeMetrics) {
            row.push(
              email.opened_at ? 'Yes' : 'No',
              email.clicked_at ? 'Yes' : 'No',
              email.replied_at ? 'Yes' : 'No'
            );
          }

          return row.join(',');
        });

        content = [headers.join(','), ...rows].join('\n');
        filename = `email-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Share or download the file
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For mobile, use Share API with text content
        await Share.share({
          message: content,
          title: 'Export Email Data',
        });
      }

      return {
        filename,
        recordCount: emails.length,
      };
    },
  });
}

/**
 * Hook to export analytics summary
 */
export function useExportAnalyticsSummary() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dateRange?: { start: Date; end: Date }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch email communications
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

      const { data: emails, error } = await query;
      if (error) throw error;

      if (!emails || emails.length === 0) {
        throw new Error('No analytics data to export');
      }

      // Calculate metrics
      const totalSent = emails.length;
      const delivered = emails.filter(
        (e) =>
          e.status === 'delivered' ||
          e.status === 'opened' ||
          e.status === 'clicked'
      ).length;
      const opened = emails.filter((e) => !!e.opened_at).length;
      const clicked = emails.filter((e) => !!e.clicked_at).length;
      const replied = emails.filter((e) => !!e.replied_at).length;
      const bounced = emails.filter((e) => e.status === 'failed').length;

      const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
      const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
      const replyRate = delivered > 0 ? (replied / delivered) * 100 : 0;
      const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;

      // Create summary content
      const summary = {
        export_date: new Date().toISOString(),
        date_range: dateRange
          ? {
              start: dateRange.start.toISOString(),
              end: dateRange.end.toISOString(),
            }
          : 'All time',
        metrics: {
          total_sent: totalSent,
          delivered,
          opened,
          clicked,
          replied,
          bounced,
          delivery_rate: `${deliveryRate.toFixed(2)}%`,
          open_rate: `${openRate.toFixed(2)}%`,
          click_rate: `${clickRate.toFixed(2)}%`,
          reply_rate: `${replyRate.toFixed(2)}%`,
          bounce_rate: `${bounceRate.toFixed(2)}%`,
        },
      };

      const content = JSON.stringify(summary, null, 2);
      const filename = `analytics-summary-${
        new Date().toISOString().split('T')[0]
      }.json`;

      // Share or download the file
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // For mobile, use Share API with text content
        await Share.share({
          message: content,
          title: 'Export Analytics Summary',
        });
      }

      return {
        filename,
        metrics: summary.metrics,
      };
    },
  });
}
