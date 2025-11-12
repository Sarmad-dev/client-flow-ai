-- Create automation_rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  trigger text NOT NULL CHECK (trigger IN ('task_completed', 'task_overdue', 'status_changed', 'time_tracked', 'due_date_approaching')),
  conditions jsonb DEFAULT '{}',
  actions jsonb NOT NULL,
  is_active boolean DEFAULT true,
  execution_count integer DEFAULT 0,
  last_executed timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create automation_executions table
CREATE TABLE IF NOT EXISTS automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES automation_rules(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  trigger_event text NOT NULL,
  executed_actions jsonb NOT NULL,
  execution_status text NOT NULL CHECK (execution_status IN ('success', 'failed', 'partial')),
  error_message text,
  executed_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_automation_rules_user_id ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger);
CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON automation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule_id ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_user_id ON automation_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_task_id ON automation_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_executed_at ON automation_executions(executed_at);

-- Enable Row Level Security
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for automation_rules
CREATE POLICY "Users can view their own automation rules" ON automation_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation rules" ON automation_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own automation rules" ON automation_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own automation rules" ON automation_rules
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for automation_executions
CREATE POLICY "Users can view their own automation executions" ON automation_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own automation executions" ON automation_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_automation_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_rules_updated_at();

-- Create function to automatically execute automation rules
CREATE OR REPLACE FUNCTION trigger_automation_rules()
RETURNS TRIGGER AS $$
DECLARE
  rule_record RECORD;
  execution_result jsonb;
BEGIN
  -- Get active automation rules for the user that match the trigger
  FOR rule_record IN 
    SELECT * FROM automation_rules 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND is_active = true
    AND (
      (TG_OP = 'UPDATE' AND trigger = 'status_changed' AND OLD.status != NEW.status) OR
      (TG_OP = 'UPDATE' AND trigger = 'task_completed' AND NEW.status = 'completed' AND OLD.status != 'completed') OR
      (TG_OP = 'INSERT' AND trigger = 'task_overdue' AND NEW.due_date < CURRENT_DATE AND NEW.status NOT IN ('completed', 'cancelled'))
    )
  LOOP
    -- Log that we would execute this rule (actual execution would be handled by the application)
    INSERT INTO automation_executions (
      rule_id,
      user_id,
      task_id,
      trigger_event,
      executed_actions,
      execution_status,
      executed_at
    ) VALUES (
      rule_record.id,
      rule_record.user_id,
      COALESCE(NEW.id, OLD.id),
      rule_record.trigger,
      '[]'::jsonb,
      'success',
      now()
    );
    
    -- Update execution count
    UPDATE automation_rules 
    SET execution_count = execution_count + 1,
        last_executed = now()
    WHERE id = rule_record.id;
  END LOOP;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for task automation
CREATE TRIGGER task_automation_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_automation_rules();

-- Grant necessary permissions
GRANT ALL ON automation_rules TO authenticated;
GRANT ALL ON automation_executions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;