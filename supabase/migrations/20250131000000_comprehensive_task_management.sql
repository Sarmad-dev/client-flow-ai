/*
  # Comprehensive Task Management System

  1. Enhanced Tasks Table
    - Add columns for subtasks, templates, time tracking, and progress
    - Add automation rules and enhanced priority levels

  2. New Tables
    - `task_dependencies` - Task dependency relationships
    - `task_templates` - Reusable task templates
    - `time_entries` - Time tracking for tasks
    - `task_comments` - Comments and collaboration
    - `task_assignments` - Multi-user task assignments

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access their own data
    - Add collaboration policies for shared tasks

  4. Performance
    - Add indexes for optimal query performance
    - Add constraints for data integrity
*/

-- Enhance existing tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS template_id uuid,
ADD COLUMN IF NOT EXISTS estimated_hours decimal,
ADD COLUMN IF NOT EXISTS actual_hours decimal DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS automation_rules jsonb;

-- Update priority enum to include 'urgent'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Update status enum to include 'blocked'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked'));

-- Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id),
  -- Prevent self-referencing dependencies
  CHECK (task_id != depends_on_task_id)
);

-- Create task_templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL,
  is_public boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  description text,
  is_manual boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  -- Ensure end_time is after start_time when both are present
  CHECK (end_time IS NULL OR end_time > start_time),
  -- Ensure duration_minutes is positive when present
  CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_assignments table
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Add foreign key constraint for template_id after creating task_templates table
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_template_id 
FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL;

-- Enable Row Level Security on all new tables
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for task_dependencies
CREATE POLICY "Users can read dependencies for their tasks"
  ON task_dependencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_dependencies.task_id 
      AND tasks.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_dependencies.depends_on_task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage dependencies for their tasks"
  ON task_dependencies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_dependencies.task_id 
      AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_dependencies.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Policies for task_templates
CREATE POLICY "Users can read own templates and public templates"
  ON task_templates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can manage own templates"
  ON task_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for time_entries
CREATE POLICY "Users can read time entries for their tasks"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = time_entries.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own time entries"
  ON time_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policies for task_comments
CREATE POLICY "Users can read comments for their tasks or assigned tasks"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id 
      AND tasks.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM task_assignments 
      WHERE task_assignments.task_id = task_comments.task_id 
      AND task_assignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to their tasks or assigned tasks"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM tasks 
        WHERE tasks.id = task_comments.task_id 
        AND tasks.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM task_assignments 
        WHERE task_assignments.task_id = task_comments.task_id 
        AND task_assignments.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON task_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON task_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for task_assignments
CREATE POLICY "Users can read assignments for their tasks"
  ON task_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_assignments.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Task owners can manage assignments"
  ON task_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_assignments.task_id 
      AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_assignments.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_template_id ON tasks(template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_percentage ON tasks(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_tasks_is_template ON tasks(is_template);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_task_id ON task_dependencies(depends_on_task_id);

CREATE INDEX IF NOT EXISTS idx_task_templates_user_id ON task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_is_public ON task_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_task_templates_usage_count ON task_templates(usage_count);

CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_is_manual ON time_entries(is_manual);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON task_assignments(assigned_by);

-- Create function to update task progress based on subtasks
CREATE OR REPLACE FUNCTION update_task_progress()
RETURNS trigger AS $
BEGIN
  -- Update parent task progress when subtask status changes
  IF NEW.parent_task_id IS NOT NULL THEN
    UPDATE tasks 
    SET progress_percentage = (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*)::decimal) * 100
        )::integer, 
        0
      )
      FROM tasks 
      WHERE parent_task_id = NEW.parent_task_id
    ),
    updated_at = now()
    WHERE id = NEW.parent_task_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update parent task progress
DROP TRIGGER IF EXISTS trigger_update_task_progress ON tasks;
CREATE TRIGGER trigger_update_task_progress
  AFTER INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  WHEN (NEW.parent_task_id IS NOT NULL)
  EXECUTE FUNCTION update_task_progress();

-- Create function to prevent circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS trigger AS $
BEGIN
  -- Check if adding this dependency would create a circular reference
  IF EXISTS (
    WITH RECURSIVE dependency_chain AS (
      -- Start with the new dependency
      SELECT NEW.depends_on_task_id as task_id, NEW.task_id as depends_on
      
      UNION ALL
      
      -- Follow the chain of dependencies
      SELECT td.depends_on_task_id, dc.depends_on
      FROM task_dependencies td
      JOIN dependency_chain dc ON td.task_id = dc.task_id
    )
    SELECT 1 FROM dependency_chain 
    WHERE task_id = depends_on
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected. Cannot add dependency from task % to task %', 
      NEW.task_id, NEW.depends_on_task_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent circular dependencies
DROP TRIGGER IF EXISTS trigger_check_circular_dependency ON task_dependencies;
CREATE TRIGGER trigger_check_circular_dependency
  BEFORE INSERT ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_dependency();

-- Create function to update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS trigger AS $
BEGIN
  -- Increment usage count when a task is created from a template
  IF NEW.template_id IS NOT NULL THEN
    UPDATE task_templates 
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = NEW.template_id;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to track template usage
DROP TRIGGER IF EXISTS trigger_increment_template_usage ON tasks;
CREATE TRIGGER trigger_increment_template_usage
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.template_id IS NOT NULL)
  EXECUTE FUNCTION increment_template_usage();

-- Create function to calculate actual hours from time entries
CREATE OR REPLACE FUNCTION update_actual_hours()
RETURNS trigger AS $
BEGIN
  -- Update task actual_hours when time entries change
  UPDATE tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(duration_minutes), 0) / 60.0
    FROM time_entries 
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    AND end_time IS NOT NULL
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update actual hours
DROP TRIGGER IF EXISTS trigger_update_actual_hours ON time_entries;
CREATE TRIGGER trigger_update_actual_hours
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_actual_hours();

-- Create function to automatically calculate duration for time entries
CREATE OR REPLACE FUNCTION calculate_time_entry_duration()
RETURNS trigger AS $
BEGIN
  -- Calculate duration when end_time is set
  IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically calculate duration
DROP TRIGGER IF EXISTS trigger_calculate_time_entry_duration ON time_entries;
CREATE TRIGGER trigger_calculate_time_entry_duration
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_duration();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to update updated_at for tables that have this column
DROP TRIGGER IF EXISTS trigger_update_task_templates_updated_at ON task_templates;
CREATE TRIGGER trigger_update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_task_comments_updated_at ON task_comments;
CREATE TRIGGER trigger_update_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();