import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useSuggestTaskFromEmail() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: { emailId: string }) => {
      // Fetch email and recent history
      const { data: email } = await supabase
        .from('email_communications')
        .select('*')
        .eq('id', payload.emailId)
        .single();
      const { data: history } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('recipient_email', email?.recipient_email)
        .order('created_at', { ascending: false })
        .limit(10);

      // Very simple heuristic suggestion; replace with real AI call in lib/ai.ts
      const subject = email?.subject?.toLowerCase() || '';
      const body = email?.body_text?.toLowerCase() || '';
      let suggestion = 'Follow up with the contact';
      if (subject.includes('meeting') || body.includes('meeting'))
        suggestion = 'Schedule a meeting';
      if (subject.includes('quote') || body.includes('pricing'))
        suggestion = 'Send a proposal/quote';

      return {
        title: suggestion,
        description: `Suggested based on latest email: "${
          email?.subject || ''
        }"`.concat(
          history?.length ? ` and ${history.length} previous emails.` : ''
        ),
        priority: 'medium' as const,
        tag: 'follow-up' as const,
      };
    },
  });
}
