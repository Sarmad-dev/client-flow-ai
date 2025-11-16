import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailRecord {
  id: string;
  user_id: string;
  client_id: string | null;
  lead_id: string | null;
  sendgrid_message_id: string | null;
  mailgun_message_id: string | null; // Legacy field for backward compatibility
  direction: 'sent' | 'received';
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  in_reply_to_message_id: string | null;
  references: string[] | null;
  created_at: string;
  is_draft: boolean;
  is_scheduled: boolean;
  scheduled_at: string | null;
  is_read: boolean;
  thread_id: string | null;
  sequence_enrollment_id: string | null;
  signature_used: string | null;
  attachment_count: number;
  total_attachment_size: number;
}

export function useEmailStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-stats', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('email_communications')
        .select('status, opened_at, clicked_at, replied_at, created_at', {
          count: 'exact',
        })
        .eq('user_id', user.id);
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
      return { total, delivered, opened, clicked, replied };
    },
  });
}

export function useRecentEmails(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recent-emails', user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as EmailRecord[];
      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as EmailRecord[];
    },
  });
}

export function useSendEmail() {
  const { session, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      to: string;
      subject: string;
      html?: string;
      text?: string;
      client_id?: string | null;
      lead_id?: string | null;
      from?: string; // Optional custom display name
      signature_used?: string | null;
      in_reply_to_message_id?: string | null;
      references?: string[] | null;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          client_id: payload.client_id,
          lead_id: payload.lead_id,
          from: payload.from, // This will be used as display name, not email address
          signature_used: payload.signature_used,
          in_reply_to_message_id: payload.in_reply_to_message_id,
          references: payload.references,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;

      console.log('SendGrid email sent:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-stats'] });
      queryClient.invalidateQueries({ queryKey: ['email-threads'] });
      queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
    },
  });
}

export type EmailActivityPoint = {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
};

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
      if (!user?.id) return [] as EmailActivityPoint[];
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .or(
          `and(created_at.gte.${startIso},created_at.lte.${endIso}),` +
            `and(opened_at.gte.${startIso},opened_at.lte.${endIso}),` +
            `and(clicked_at.gte.${startIso},clicked_at.lte.${endIso}),` +
            `and(replied_at.gte.${startIso},replied_at.lte.${endIso})`
        );
      if (error) throw error;

      const dayKey = (d: Date) => d.toISOString().slice(0, 10);
      const days: Record<string, EmailActivityPoint> = {};

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

      const clamp = (iso: string | null) => (iso ? new Date(iso) : null);

      for (const row of (data ?? []) as EmailRecord[]) {
        const c = clamp(row.created_at);
        const o = clamp(row.opened_at);
        const cl = clamp(row.clicked_at);
        const r = clamp(row.replied_at);

        if (c) {
          const k = dayKey(c);
          if (days[k]) days[k].sent += 1;
          // Treat delivered as sent+opened/clicked for visualization
          if (
            row.status === 'delivered' ||
            row.status === 'opened' ||
            row.status === 'clicked'
          ) {
            if (days[k]) days[k].delivered += 1;
          }
        }
        if (o) {
          const k = dayKey(o);
          if (days[k]) days[k].opened += 1;
        }
        if (cl) {
          const k = dayKey(cl);
          if (days[k]) days[k].clicked += 1;
        }
        if (r) {
          const k = dayKey(r);
          if (days[k]) days[k].replied += 1;
        }
      }

      return Object.values(days);
    },
  });
}

export interface EmailThread {
  counterpartyEmail: string;
  displayName: string | null;
  lastMessageTime: string;
  lastSubject: string | null;
  totalCount: number;
  unreadCount: number;
  hasReplied: boolean;
  threadId: string;
}

export function useEmailThreads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['email-threads', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [] as EmailThread[];

      const [emailsRes, clientsRes, leadsRes] = await Promise.all([
        supabase
          .from('email_communications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('clients').select('email, name').eq('user_id', user.id),
        supabase.from('leads').select('email, name').eq('user_id', user.id),
      ]);

      if (emailsRes.error) throw emailsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (leadsRes.error) throw leadsRes.error;

      const emails = (emailsRes.data ?? []) as EmailRecord[];
      const clientNameByEmail = new Map<string, string>();
      for (const c of (clientsRes.data ?? []) as {
        email: string | null;
        name: string;
      }[]) {
        const key = (c?.email || '').toLowerCase();
        if (key) clientNameByEmail.set(key, c.name);
      }
      for (const l of (leadsRes.data ?? []) as {
        email: string | null;
        name: string;
      }[]) {
        const key = (l?.email || '').toLowerCase();
        if (key && !clientNameByEmail.has(key))
          clientNameByEmail.set(key, l.name);
      }

      const eligible = emails.filter(
        (e) => e.direction === 'sent' || !!e.replied_at
      );

      const grouped = new Map<string, EmailRecord[]>();
      for (const e of eligible) {
        const counterparty = (
          e.direction === 'sent' ? e.recipient_email : e.sender_email
        )?.toLowerCase();
        if (!counterparty) continue;
        if (!grouped.has(counterparty)) grouped.set(counterparty, []);
        grouped.get(counterparty)!.push(e);
      }

      const threads: EmailThread[] = [];
      for (const [email, items] of grouped.entries()) {
        const allWithCounterparty = emails.filter(
          (e) =>
            (e.sender_email || '').toLowerCase() === email ||
            (e.recipient_email || '').toLowerCase() === email
        );
        if (allWithCounterparty.length === 0) continue;
        const last = allWithCounterparty.reduce((a, b) =>
          new Date(a.created_at) > new Date(b.created_at) ? a : b
        );
        const name = clientNameByEmail.get(email) ?? null;
        const hasReplied = items.some((e) => !!e.replied_at);

        // Calculate unread count (received emails without opened_at)
        const unreadCount = allWithCounterparty.filter(
          (e) => e.direction === 'received' && !e.opened_at
        ).length;

        // Generate thread ID from counterparty email
        const threadId = `thread-${email.replace(/[^a-z0-9]/gi, '-')}`;

        threads.push({
          counterpartyEmail: email,
          displayName: name,
          lastMessageTime: last.created_at,
          lastSubject: last.subject,
          totalCount: allWithCounterparty.length,
          unreadCount,
          hasReplied,
          threadId,
        });
      }

      threads.sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
      );
      return threads;
    },
  });
}

export function useThreadMessages(counterpartyEmail?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [
      'thread-messages',
      user?.id,
      (counterpartyEmail || '').toLowerCase(),
    ],
    enabled: !!user?.id && !!counterpartyEmail,
    queryFn: async () => {
      if (!user?.id || !counterpartyEmail) return [] as EmailRecord[];
      const emailLower = counterpartyEmail.toLowerCase();
      const { data, error } = await supabase
        .from('email_communications')
        .select('*')
        .eq('user_id', user.id)
        .or(
          `sender_email.ilike.${emailLower},recipient_email.ilike.${emailLower}`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmailRecord[];
    },
  });
}

export function useEnhanceEmail() {
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      recipient?: string;
      subject?: string;
      tone?: 'professional' | 'casual' | 'formal' | 'friendly';
    }) => {
      const { enhanceEmailContent } = await import('@/lib/ai');
      return await enhanceEmailContent(payload.content, {
        recipient: payload.recipient,
        subject: payload.subject,
        tone: payload.tone,
      });
    },
  });
}
