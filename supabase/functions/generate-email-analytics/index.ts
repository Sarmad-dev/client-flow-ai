// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cache expiration time (24 hours)
const CACHE_EXPIRATION_HOURS = 24;

interface AnalyticsCacheEntry {
  user_id: string;
  metric_type: string;
  date_range_start: string;
  date_range_end: string;
  data: any;
  expires_at: string;
}

function formatError(error: any): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    // Handle Supabase errors
    if ('message' in error) return error.message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Calculate daily statistics for a user
 */
async function calculateDailyStats(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const { data: emails, error } = await supabaseAdmin
    .from('email_communications')
    .select('status, opened_at, clicked_at, replied_at, created_at, direction')
    .eq('user_id', userId)
    .eq('direction', 'sent')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Database error in calculateDailyStats',
        userId,
        error: formatError(error),
        code: error.code,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }

  const totalSent = emails?.length || 0;
  const delivered =
    emails?.filter(
      (e) =>
        e.status === 'delivered' ||
        e.status === 'opened' ||
        e.status === 'clicked'
    )?.length || 0;
  const opened = emails?.filter((e) => !!e.opened_at)?.length || 0;
  const clicked = emails?.filter((e) => !!e.clicked_at)?.length || 0;
  const replied = emails?.filter((e) => !!e.replied_at)?.length || 0;
  const bounced = emails?.filter((e) => e.status === 'failed')?.length || 0;

  return {
    total_sent: totalSent,
    delivered,
    opened,
    clicked,
    replied,
    bounced,
    delivery_rate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
    open_rate: delivered > 0 ? (opened / delivered) * 100 : 0,
    click_rate: delivered > 0 ? (clicked / delivered) * 100 : 0,
    reply_rate: delivered > 0 ? (replied / delivered) * 100 : 0,
    bounce_rate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
  };
}

/**
 * Calculate template performance for a user
 * Note: template_id column doesn't exist in email_communications yet
 * This function returns empty array until the schema is updated
 */
async function calculateTemplatePerformance(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  try {
    // Check if template_id column exists by attempting a query
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('email_communications')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    // If the basic query fails, return empty array
    if (testError) {
      console.log(
        JSON.stringify({
          level: 'warn',
          message:
            'Template performance calculation skipped - schema not ready',
          error: formatError(testError),
          timestamp: new Date().toISOString(),
        })
      );
      return [];
    }

    // For now, return empty array since template_id doesn't exist in email_communications
    // TODO: Add template_id column to email_communications table in a future migration
    return [];

    /* Future implementation when template_id is added:
    
    // Fetch templates
    const { data: templates, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('id, name')
      .eq('user_id', userId);

    if (templateError) throw templateError;

    // Fetch emails with template usage
    const { data: emails, error: emailError } = await supabaseAdmin
      .from('email_communications')
      .select('template_id, opened_at, clicked_at, replied_at, status')
      .eq('user_id', userId)
      .eq('direction', 'sent')
      .not('template_id', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (emailError) throw emailError;

    // ... rest of implementation
    */
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Error in calculateTemplatePerformance',
        error: formatError(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      })
    );
    return [];
  }
}

/**
 * Calculate recipient engagement for a user
 */
async function calculateRecipientEngagement(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  // Fetch emails
  const { data: emails, error: emailError } = await supabaseAdmin
    .from('email_communications')
    .select('recipient_email, opened_at, clicked_at, replied_at, created_at')
    .eq('user_id', userId)
    .eq('direction', 'sent')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (emailError) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Database error in calculateRecipientEngagement',
        userId,
        error: formatError(emailError),
        code: emailError.code,
        details: emailError.details,
        hint: emailError.hint,
        timestamp: new Date().toISOString(),
      })
    );
    throw emailError;
  }

  // Aggregate by recipient
  const recipientMap = new Map<
    string,
    {
      total_emails: number;
      opens: number;
      clicks: number;
      replies: number;
      last_interaction: Date | null;
    }
  >();

  for (const email of emails || []) {
    if (!email.recipient_email) continue;

    const recipientKey = email.recipient_email.toLowerCase();
    if (!recipientMap.has(recipientKey)) {
      recipientMap.set(recipientKey, {
        total_emails: 0,
        opens: 0,
        clicks: 0,
        replies: 0,
        last_interaction: null,
      });
    }

    const stats = recipientMap.get(recipientKey)!;
    stats.total_emails += 1;

    if (email.opened_at) {
      stats.opens += 1;
      const openDate = new Date(email.opened_at);
      if (!stats.last_interaction || openDate > stats.last_interaction) {
        stats.last_interaction = openDate;
      }
    }

    if (email.clicked_at) {
      stats.clicks += 1;
      const clickDate = new Date(email.clicked_at);
      if (!stats.last_interaction || clickDate > stats.last_interaction) {
        stats.last_interaction = clickDate;
      }
    }

    if (email.replied_at) {
      stats.replies += 1;
      const replyDate = new Date(email.replied_at);
      if (!stats.last_interaction || replyDate > stats.last_interaction) {
        stats.last_interaction = replyDate;
      }
    }
  }

  // Convert to array and calculate engagement scores
  const recipients = [];
  for (const [email, stats] of recipientMap.entries()) {
    // Engagement score: weighted sum of interactions
    const engagementScore =
      stats.opens * 1 + stats.clicks * 2 + stats.replies * 3;

    recipients.push({
      email,
      total_emails: stats.total_emails,
      opens: stats.opens,
      clicks: stats.clicks,
      replies: stats.replies,
      engagement_score: engagementScore,
      last_interaction: stats.last_interaction?.toISOString() || null,
    });
  }

  // Sort by engagement score descending and limit to top 50
  recipients.sort((a, b) => b.engagement_score - a.engagement_score);
  return recipients.slice(0, 50);
}

/**
 * Store analytics cache entry
 */
async function storeCacheEntry(entry: AnalyticsCacheEntry): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_analytics_cache')
    .upsert(entry, {
      onConflict: 'user_id,metric_type,date_range_start,date_range_end',
    });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Database error in storeCacheEntry',
        userId: entry.user_id,
        metricType: entry.metric_type,
        error: formatError(error),
        code: error.code,
        details: error.details,
        hint: error.hint,
        timestamp: new Date().toISOString(),
      })
    );
    throw error;
  }
}

/**
 * Generate analytics for a specific user
 */
async function generateUserAnalytics(userId: string): Promise<any> {
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + CACHE_EXPIRATION_HOURS * 60 * 60 * 1000
  );

  // Define date ranges to cache
  const dateRanges = [
    {
      name: 'last_7_days',
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: now,
    },
    {
      name: 'last_30_days',
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: now,
    },
    {
      name: 'last_90_days',
      start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      end: now,
    },
  ];

  const results = [];

  for (const range of dateRanges) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Profile not found for user',
            userId,
            timestamp: new Date().toISOString(),
          })
        );
        throw new Error('Profile not found for user');
      }
      // Calculate daily stats
      const dailyStats = await calculateDailyStats(
        userId,
        range.start,
        range.end
      );

      await storeCacheEntry({
        user_id: profile.id,
        metric_type: `daily_stats_${range.name}`,
        date_range_start: range.start.toISOString().split('T')[0],
        date_range_end: range.end.toISOString().split('T')[0],
        data: dailyStats,
        expires_at: expiresAt.toISOString(),
      });

      // Calculate template performance
      const templatePerf = await calculateTemplatePerformance(
        userId,
        range.start,
        range.end
      );

      await storeCacheEntry({
        user_id: profile.id,
        metric_type: `template_performance_${range.name}`,
        date_range_start: range.start.toISOString().split('T')[0],
        date_range_end: range.end.toISOString().split('T')[0],
        data: templatePerf,
        expires_at: expiresAt.toISOString(),
      });

      // Calculate recipient engagement
      const recipientEng = await calculateRecipientEngagement(
        userId,
        range.start,
        range.end
      );

      await storeCacheEntry({
        user_id: profile.id,
        metric_type: `recipient_engagement_${range.name}`,
        date_range_start: range.start.toISOString().split('T')[0],
        date_range_end: range.end.toISOString().split('T')[0],
        data: recipientEng,
        expires_at: expiresAt.toISOString(),
      });

      results.push({
        range: range.name,
        cached: true,
      });
    } catch (error) {
      const errorMessage = formatError(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Failed to generate analytics for range',
          userId,
          range: range.name,
          error: errorMessage,
          stack: errorStack,
          errorType: error?.constructor?.name,
          timestamp: new Date().toISOString(),
        })
      );
      results.push({
        range: range.name,
        cached: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Main handler function
 */
async function handler(req: Request): Promise<Response> {
  const startTime = Date.now();

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Starting analytics cache generation',
      timestamp: new Date().toISOString(),
    })
  );

  try {
    // Get user_id from query params or generate for all users
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    if (userId) {
      // Generate for specific user
      const results = await generateUserAnalytics(userId);
      const duration = Date.now() - startTime;

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Analytics cache generation completed for user',
          userId,
          results,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        })
      );

      return new Response(
        JSON.stringify({
          message: 'Analytics cache generated',
          userId,
          results,
          durationMs: duration,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // Generate for all active users (users with emails in last 90 days)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const { data: activeUsers, error: usersError } = await supabaseAdmin
        .from('email_communications')
        .select('user_id')
        .gte('created_at', ninetyDaysAgo.toISOString())
        .limit(1000);

      if (usersError) throw usersError;

      // Get unique user IDs
      const uniqueUserIds = [
        ...new Set(activeUsers?.map((u) => u.user_id) || []),
      ];

      console.log(
        JSON.stringify({
          level: 'info',
          message: `Generating analytics for ${uniqueUserIds.length} active users`,
          timestamp: new Date().toISOString(),
        })
      );

      const allResults = [];
      for (const uid of uniqueUserIds) {
        try {
          const results = await generateUserAnalytics(uid);
          allResults.push({ userId: uid, results });
        } catch (error) {
          const errorMessage = formatError(error);
          const errorStack = error instanceof Error ? error.stack : undefined;

          console.error(
            JSON.stringify({
              level: 'error',
              message: 'Failed to generate analytics for user',
              userId: uid,
              error: errorMessage,
              stack: errorStack,
              errorType: error?.constructor?.name,
              timestamp: new Date().toISOString(),
            })
          );
          allResults.push({
            userId: uid,
            error: errorMessage,
          });
        }
      }

      const duration = Date.now() - startTime;

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Analytics cache generation completed for all users',
          totalUsers: uniqueUserIds.length,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        })
      );

      return new Response(
        JSON.stringify({
          message: 'Analytics cache generated for all users',
          totalUsers: uniqueUserIds.length,
          results: allResults,
          durationMs: duration,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    const errorMsg = formatError(error);
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Unexpected error in handler',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMsg,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
