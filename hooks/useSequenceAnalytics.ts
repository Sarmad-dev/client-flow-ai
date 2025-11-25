import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface SequenceAnalytics {
  sequence_id: string;
  sequence_name: string;
  enrollment_count: number;
  active_count: number;
  completed_count: number;
  cancelled_count: number;
  completion_rate: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_replied: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
}

export function useSequenceAnalytics(sequenceId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['sequence-analytics', user?.id, sequenceId],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as SequenceAnalytics[];

      // Build query for sequences
      let sequencesQuery = supabase
        .from('email_sequences')
        .select('id, name')
        .eq('user_id', user.id);

      if (sequenceId) {
        sequencesQuery = sequencesQuery.eq('id', sequenceId);
      }

      const { data: sequences, error: seqError } = await sequencesQuery;
      if (seqError) throw seqError;

      if (!sequences || sequences.length === 0) {
        return [] as SequenceAnalytics[];
      }

      const analytics: SequenceAnalytics[] = [];

      for (const sequence of sequences) {
        // Get enrollment stats
        const { data: enrollments, error: enrollError } = await supabase
          .from('sequence_enrollments')
          .select('status')
          .eq('sequence_id', sequence.id);

        if (enrollError) throw enrollError;

        const enrollmentCount = enrollments?.length || 0;
        const activeCount =
          enrollments?.filter((e) => e.status === 'active').length || 0;
        const completedCount =
          enrollments?.filter((e) => e.status === 'completed').length || 0;
        const cancelledCount =
          enrollments?.filter((e) => e.status === 'cancelled').length || 0;

        const completionRate =
          enrollmentCount > 0 ? (completedCount / enrollmentCount) * 100 : 0;

        // Get email stats for this sequence
        const { data: emails, error: emailError } = await supabase
          .from('email_communications')
          .select('opened_at, clicked_at, replied_at')
          .eq('user_id', user.id)
          .not('sequence_enrollment_id', 'is', null)
          .in(
            'sequence_enrollment_id',
            enrollments?.map((e: any) => e.id) || []
          );

        console.log('Enrollments: ', user.id);

        console.log('Email Error: ', emailError);
        console.log('Emails: ', emails);
        if (emailError) throw emailError;

        const emailsSent = emails?.length || 0;
        const emailsOpened =
          emails?.filter((e) => e.opened_at !== null).length || 0;
        const emailsClicked =
          emails?.filter((e) => e.clicked_at !== null).length || 0;
        const emailsReplied =
          emails?.filter((e) => e.replied_at !== null).length || 0;

        const openRate = emailsSent > 0 ? (emailsOpened / emailsSent) * 100 : 0;
        const clickRate =
          emailsSent > 0 ? (emailsClicked / emailsSent) * 100 : 0;
        const replyRate =
          emailsSent > 0 ? (emailsReplied / emailsSent) * 100 : 0;

        analytics.push({
          sequence_id: sequence.id,
          sequence_name: sequence.name,
          enrollment_count: enrollmentCount,
          active_count: activeCount,
          completed_count: completedCount,
          cancelled_count: cancelledCount,
          completion_rate: Math.round(completionRate * 10) / 10,
          emails_sent: emailsSent,
          emails_opened: emailsOpened,
          emails_clicked: emailsClicked,
          emails_replied: emailsReplied,
          open_rate: Math.round(openRate * 10) / 10,
          click_rate: Math.round(clickRate * 10) / 10,
          reply_rate: Math.round(replyRate * 10) / 10,
        });
      }

      console.log('Analytics: ', analytics);

      return analytics;
    },
  });
}

export function useSequenceComparison() {
  const { data: analytics = [] } = useSequenceAnalytics();

  // Sort by completion rate descending
  const sorted = [...analytics].sort(
    (a: SequenceAnalytics, b: SequenceAnalytics) =>
      b.completion_rate - a.completion_rate
  );

  return sorted;
}
