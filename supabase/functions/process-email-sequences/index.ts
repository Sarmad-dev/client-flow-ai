// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BATCH_SIZE = 50;

interface SequenceEnrollment {
  id: string;
  user_id: string;
  sequence_id: string;
  contact_email: string;
  client_id: string | null;
  lead_id: string | null;
  current_step: number;
  status: string;
  last_email_sent_at: string | null;
  next_email_scheduled_at: string | null;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  template_id: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
}

interface ProcessingResult {
  total: number;
  sent: number;
  completed: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Get sequence steps for a given sequence
 */
async function getSequenceSteps(
  sequenceId: string
): Promise<SequenceStep[] | null> {
  const { data, error } = await supabaseAdmin
    .from('sequence_steps')
    .select('*')
    .eq('sequence_id', sequenceId)
    .order('step_order', { ascending: true });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Failed to fetch sequence steps',
        sequenceId,
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    );
    return null;
  }

  return data as SequenceStep[];
}

/**
 * Get template content if step uses a template
 */
async function getTemplateContent(templateId: string): Promise<{
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('subject, body_html, body_text')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Failed to fetch template',
        templateId,
        error: error.message,
        timestamp: new Date().toISOString(),
      })
    );
    return null;
  }

  return data;
}

/**
 * Process a single enrollment
 */
async function processEnrollment(
  enrollment: SequenceEnrollment
): Promise<{ success: boolean; completed: boolean; error?: string }> {
  try {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Processing sequence enrollment',
        enrollmentId: enrollment.id,
        userId: enrollment.user_id,
        contactEmail: enrollment.contact_email,
        currentStep: enrollment.current_step,
        timestamp: new Date().toISOString(),
      })
    );

    // Get sequence steps
    const steps = await getSequenceSteps(enrollment.sequence_id);
    if (!steps || steps.length === 0) {
      return {
        success: false,
        completed: false,
        error: 'No steps found for sequence',
      };
    }

    // Check if enrollment is complete
    if (enrollment.current_step >= steps.length) {
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Enrollment completed all steps',
          enrollmentId: enrollment.id,
          timestamp: new Date().toISOString(),
        })
      );

      await supabaseAdmin
        .from('sequence_enrollments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);

      return { success: true, completed: true };
    }

    // Get current step
    const currentStep = steps[enrollment.current_step];
    if (!currentStep) {
      return {
        success: false,
        completed: false,
        error: 'Current step not found',
      };
    }

    // Get email content (from template or custom)
    let subject = currentStep.subject;
    let bodyHtml = currentStep.body_html;
    let bodyText = currentStep.body_text;

    if (currentStep.template_id) {
      const template = await getTemplateContent(currentStep.template_id);
      if (template) {
        subject = template.subject || subject;
        bodyHtml = template.body_html || bodyHtml;
        bodyText = template.body_text || bodyText;
      }
    }

    if (!subject || (!bodyHtml && !bodyText)) {
      return {
        success: false,
        completed: false,
        error: 'Step has no content',
      };
    }

    // Get user for sending email
    const { data: user, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);

    if (userErr || !user) {
      return {
        success: false,
        completed: false,
        error: `Failed to get user: ${userErr?.message || 'User not found'}`,
      };
    }

    // Send email using service role key
    // The send-email function will handle authentication internally
    const { data: sendResult, error: funcErr } =
      await supabaseAdmin.functions.invoke('send-email', {
        body: {
          to: enrollment.contact_email,
          subject: subject,
          html: bodyHtml,
          text: bodyText,
          client_id: enrollment.client_id,
          lead_id: enrollment.lead_id,
          from: user.user?.email?.split('@')[0] || 'sequence',
          user_id: enrollment.user_id, // Pass user_id for proper attribution
        },
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

    if (funcErr) {
      return {
        success: false,
        completed: false,
        error: `Send function error: ${funcErr.message || 'Unknown error'}`,
      };
    }

    // Update enrollment to next step
    const nextStep = enrollment.current_step + 1;
    const isComplete = nextStep >= steps.length;

    let nextScheduledAt = null;
    if (!isComplete && steps[nextStep]) {
      const nextStepDelay = steps[nextStep].delay_hours;
      const scheduledDate = new Date();
      scheduledDate.setHours(scheduledDate.getHours() + nextStepDelay);
      nextScheduledAt = scheduledDate.toISOString();
    }

    await supabaseAdmin
      .from('sequence_enrollments')
      .update({
        current_step: nextStep,
        status: isComplete ? 'completed' : 'active',
        last_email_sent_at: new Date().toISOString(),
        next_email_scheduled_at: nextScheduledAt,
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq('id', enrollment.id);

    // Link email to enrollment
    if (sendResult?.emailId) {
      await supabaseAdmin
        .from('email_communications')
        .update({
          sequence_enrollment_id: enrollment.id,
        })
        .eq('id', sendResult.emailId);
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Sequence email sent successfully',
        enrollmentId: enrollment.id,
        currentStep: enrollment.current_step,
        nextStep,
        isComplete,
        sendGridMessageId: sendResult?.messageId,
        timestamp: new Date().toISOString(),
      })
    );

    return { success: true, completed: isComplete };
  } catch (e) {
    const errorMsg = `Unexpected error: ${
      e instanceof Error ? e.message : String(e)
    }`;
    console.error(
      JSON.stringify({
        level: 'error',
        message: errorMsg,
        enrollmentId: enrollment.id,
        timestamp: new Date().toISOString(),
      })
    );
    return { success: false, completed: false, error: errorMsg };
  }
}

/**
 * Main handler function
 */
async function handler(): Promise<Response> {
  const startTime = Date.now();
  const now = new Date().toISOString();

  console.log(
    JSON.stringify({
      level: 'info',
      message: 'Starting sequence processing',
      timestamp: now,
    })
  );

  const result: ProcessingResult = {
    total: 0,
    sent: 0,
    completed: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Fetch due enrollments
    const { data: enrollments, error: fetchError } = await supabaseAdmin
      .from('sequence_enrollments')
      .select('*')
      .eq('status', 'active')
      .not('next_email_scheduled_at', 'is', null)
      .lte('next_email_scheduled_at', now)
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Failed to fetch enrollments',
          error: fetchError.message,
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(
        JSON.stringify({ error: fetchError.message, result }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    result.total = enrollments?.length || 0;

    if (result.total === 0) {
      console.log(
        JSON.stringify({
          level: 'info',
          message: 'No enrollments to process',
          timestamp: new Date().toISOString(),
        })
      );
      return new Response(
        JSON.stringify({ message: 'No enrollments to process', result }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        message: `Processing ${result.total} enrollments`,
        timestamp: new Date().toISOString(),
      })
    );

    // Process each enrollment
    for (const enrollment of enrollments || []) {
      const processResult = await processEnrollment(enrollment);

      if (processResult.success) {
        result.sent++;
        if (processResult.completed) {
          result.completed++;
        }
      } else {
        result.failed++;
        result.errors.push({
          id: enrollment.id,
          error: processResult.error || 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Sequence processing completed',
        result,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Processing completed',
        result,
        durationMs: duration,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Unexpected error in handler',
        error,
        timestamp: new Date().toISOString(),
      })
    );

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error,
        result,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

Deno.serve(handler);
