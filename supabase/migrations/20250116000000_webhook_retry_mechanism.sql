-- Create webhook retry queue table
CREATE TABLE IF NOT EXISTS webhook_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL CHECK (webhook_type IN ('sendgrid', 'inbound')),
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  original_error text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for efficient querying
CREATE INDEX idx_webhook_retry_queue_status_next_retry 
  ON webhook_retry_queue(status, next_retry_at) 
  WHERE status = 'pending';

CREATE INDEX idx_webhook_retry_queue_created 
  ON webhook_retry_queue(created_at DESC);

CREATE INDEX idx_webhook_retry_queue_webhook_type 
  ON webhook_retry_queue(webhook_type);

-- Create webhook dead letter queue table for failed webhooks
CREATE TABLE IF NOT EXISTS webhook_dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  payload jsonb NOT NULL,
  original_error text,
  last_error text,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  failed_at timestamptz NOT NULL DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  resolution_notes text
);

-- Create indexes for dead letter queue
CREATE INDEX idx_webhook_dead_letter_queue_failed 
  ON webhook_dead_letter_queue(failed_at DESC);

CREATE INDEX idx_webhook_dead_letter_queue_reviewed 
  ON webhook_dead_letter_queue(reviewed) 
  WHERE NOT reviewed;

CREATE INDEX idx_webhook_dead_letter_queue_webhook_type 
  ON webhook_dead_letter_queue(webhook_type);

-- Create webhook monitoring metrics table
CREATE TABLE IF NOT EXISTS webhook_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type text NOT NULL,
  metric_date date NOT NULL,
  total_received integer DEFAULT 0,
  total_processed integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  total_retried integer DEFAULT 0,
  total_dead_letter integer DEFAULT 0,
  avg_processing_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(webhook_type, metric_date)
);

-- Create index for metrics
CREATE INDEX idx_webhook_metrics_date 
  ON webhook_metrics(metric_date DESC);

CREATE INDEX idx_webhook_metrics_webhook_type 
  ON webhook_metrics(webhook_type, metric_date DESC);

-- Function to update webhook metrics
CREATE OR REPLACE FUNCTION update_webhook_metrics(
  p_webhook_type text,
  p_metric_date date,
  p_received integer DEFAULT 0,
  p_processed integer DEFAULT 0,
  p_failed integer DEFAULT 0,
  p_retried integer DEFAULT 0,
  p_dead_letter integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO webhook_metrics (
    webhook_type,
    metric_date,
    total_received,
    total_processed,
    total_failed,
    total_retried,
    total_dead_letter,
    updated_at
  )
  VALUES (
    p_webhook_type,
    p_metric_date,
    p_received,
    p_processed,
    p_failed,
    p_retried,
    p_dead_letter,
    now()
  )
  ON CONFLICT (webhook_type, metric_date)
  DO UPDATE SET
    total_received = webhook_metrics.total_received + p_received,
    total_processed = webhook_metrics.total_processed + p_processed,
    total_failed = webhook_metrics.total_failed + p_failed,
    total_retried = webhook_metrics.total_retried + p_retried,
    total_dead_letter = webhook_metrics.total_dead_letter + p_dead_letter,
    updated_at = now();
END;
$$;

-- Function to add webhook to retry queue
CREATE OR REPLACE FUNCTION enqueue_webhook_retry(
  p_webhook_type text,
  p_payload jsonb,
  p_error text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_retry_id uuid;
BEGIN
  INSERT INTO webhook_retry_queue (
    webhook_type,
    payload,
    status,
    attempt_count,
    next_retry_at,
    original_error,
    created_at
  )
  VALUES (
    p_webhook_type,
    p_payload,
    'pending',
    0,
    now() + interval '1 second', -- Initial retry after 1 second
    p_error,
    now()
  )
  RETURNING id INTO v_retry_id;

  -- Update metrics
  PERFORM update_webhook_metrics(
    p_webhook_type,
    CURRENT_DATE,
    p_retried := 1
  );

  RETURN v_retry_id;
END;
$$;

-- Function to clean up old completed retries (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_retries()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM webhook_retry_queue
  WHERE status = 'completed'
    AND completed_at < now() - interval '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Add RLS policies (webhook tables are service-role only, no user access needed)
ALTER TABLE webhook_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_metrics ENABLE ROW LEVEL SECURITY;

-- No policies needed as these tables are only accessed by Edge Functions with service role

-- Add comment documentation
COMMENT ON TABLE webhook_retry_queue IS 'Queue for retrying failed webhook processing with exponential backoff';
COMMENT ON TABLE webhook_dead_letter_queue IS 'Storage for webhooks that failed after all retry attempts';
COMMENT ON TABLE webhook_metrics IS 'Daily metrics for webhook processing monitoring';
COMMENT ON FUNCTION enqueue_webhook_retry IS 'Add a failed webhook to the retry queue';
COMMENT ON FUNCTION cleanup_old_webhook_retries IS 'Remove completed retries older than 7 days';
