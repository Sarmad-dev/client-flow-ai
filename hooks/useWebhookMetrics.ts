import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface WebhookMetric {
  id: string;
  webhook_type: 'sendgrid' | 'inbound';
  metric_date: string;
  total_received: number;
  total_processed: number;
  total_failed: number;
  total_retried: number;
  total_dead_letter: number;
  avg_processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookRetry {
  id: string;
  webhook_type: 'sendgrid' | 'inbound';
  payload: any;
  status: 'pending' | 'completed' | 'failed';
  attempt_count: number;
  next_retry_at: string;
  original_error: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface WebhookDeadLetter {
  id: string;
  webhook_type: string;
  payload: any;
  original_error: string | null;
  last_error: string | null;
  attempt_count: number;
  created_at: string;
  failed_at: string;
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolution_notes: string | null;
}

// Fetch webhook metrics for a date range
export function useWebhookMetrics(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['webhook-metrics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_metrics')
        .select('*')
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: false });

      if (error) throw error;
      return data as WebhookMetric[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch pending webhook retries
export function useWebhookRetries(status?: 'pending' | 'completed' | 'failed') {
  return useQuery({
    queryKey: ['webhook-retries', status],
    queryFn: async () => {
      let query = supabase
        .from('webhook_retry_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WebhookRetry[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Fetch dead letter queue items
export function useWebhookDeadLetters(reviewed?: boolean) {
  return useQuery({
    queryKey: ['webhook-dead-letters', reviewed],
    queryFn: async () => {
      let query = supabase
        .from('webhook_dead_letter_queue')
        .select('*')
        .order('failed_at', { ascending: false })
        .limit(100);

      if (reviewed !== undefined) {
        query = query.eq('reviewed', reviewed);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WebhookDeadLetter[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get webhook health summary
export function useWebhookHealth() {
  return useQuery({
    queryKey: ['webhook-health'],
    queryFn: async () => {
      // Get today's metrics
      const today = new Date().toISOString().split('T')[0];

      const { data: metrics, error: metricsError } = await supabase
        .from('webhook_metrics')
        .select('*')
        .eq('metric_date', today);

      if (metricsError) throw metricsError;

      // Get pending retries count
      const { count: pendingRetries, error: retriesError } = await supabase
        .from('webhook_retry_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (retriesError) throw retriesError;

      // Get unreviewed dead letters count
      const { count: unreviewedDeadLetters, error: deadLetterError } =
        await supabase
          .from('webhook_dead_letter_queue')
          .select('*', { count: 'exact', head: true })
          .eq('reviewed', false);

      if (deadLetterError) throw deadLetterError;

      // Calculate health metrics
      const totalReceived = metrics?.reduce(
        (sum, m) => sum + m.total_received,
        0
      );
      const totalProcessed = metrics?.reduce(
        (sum, m) => sum + m.total_processed,
        0
      );
      const totalFailed = metrics?.reduce((sum, m) => sum + m.total_failed, 0);

      const successRate =
        totalReceived > 0 ? (totalProcessed / totalReceived) * 100 : 100;

      return {
        metrics: metrics || [],
        pendingRetries: pendingRetries || 0,
        unreviewedDeadLetters: unreviewedDeadLetters || 0,
        totalReceived: totalReceived || 0,
        totalProcessed: totalProcessed || 0,
        totalFailed: totalFailed || 0,
        successRate,
        isHealthy: successRate >= 95 && (unreviewedDeadLetters || 0) < 10,
      };
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}
