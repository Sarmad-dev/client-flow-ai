/*
  # Add Projects Structure

  1. New Tables
    - `projects` - Project management with client/lead relationships
    - Update tasks to reference projects instead of clients directly

  2. Changes
    - Add project_id to tasks table
    - Maintain backward compatibility with existing client_id relationships
    - Add project status and progress tracking

  3. Security
    - Enable RLS on projects table
    - Add policies for authenticated users to access their own data

  4. Performance
    - Add indexes for optimal query performance
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  start_date timestamptz,
  due_date timestamptz,
  completed_at timestamptz,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_hours decimal,
  actual_hours decimal DEFAULT 0,
  budget decimal,
  tags text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure project is associated with either client or lead, but not both
  CHECK (
    (client_id IS NOT NULL AND lead_id IS NULL) OR 
    (client_id IS NULL AND lead_id IS NOT NULL) OR
    (client_id IS NULL AND lead_id IS NULL)
  )
);

-- Add project_id to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

-- Enable Row Level Security on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policies for projects
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_progress_percentage ON projects(progress_percentage);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- Create function to update project progress based on tasks
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS trigger AS $$
BEGIN
  -- Update project progress when task status changes
  IF NEW.project_id IS NOT NULL THEN
    UPDATE projects 
    SET progress_percentage = (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*)::decimal) * 100
        )::integer, 
        0
      )
      FROM tasks 
      WHERE project_id = NEW.project_id
      AND parent_task_id IS NULL -- Only count main tasks, not subtasks
    ),
    updated_at = now()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Also handle the case where project_id is being removed
  IF OLD.project_id IS NOT NULL AND (NEW.project_id IS NULL OR NEW.project_id != OLD.project_id) THEN
    UPDATE projects 
    SET progress_percentage = (
      SELECT COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed')::decimal / COUNT(*)::decimal) * 100
        )::integer, 
        0
      )
      FROM tasks 
      WHERE project_id = OLD.project_id
      AND parent_task_id IS NULL
    ),
    updated_at = now()
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update project progress
DROP TRIGGER IF EXISTS trigger_update_project_progress ON tasks;
CREATE TRIGGER trigger_update_project_progress
  AFTER INSERT OR UPDATE OF status, project_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();

-- Create function to update project actual hours from tasks
CREATE OR REPLACE FUNCTION update_project_actual_hours()
RETURNS trigger AS $$
BEGIN
  -- Update project actual_hours when task actual_hours change
  IF NEW.project_id IS NOT NULL THEN
    UPDATE projects 
    SET actual_hours = (
      SELECT COALESCE(SUM(actual_hours), 0)
      FROM tasks 
      WHERE project_id = NEW.project_id
    ),
    updated_at = now()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Also handle the case where project_id is being removed
  IF OLD.project_id IS NOT NULL AND (NEW.project_id IS NULL OR NEW.project_id != OLD.project_id) THEN
    UPDATE projects 
    SET actual_hours = (
      SELECT COALESCE(SUM(actual_hours), 0)
      FROM tasks 
      WHERE project_id = OLD.project_id
    ),
    updated_at = now()
    WHERE id = OLD.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update project actual hours
DROP TRIGGER IF EXISTS trigger_update_project_actual_hours ON tasks;
CREATE TRIGGER trigger_update_project_actual_hours
  AFTER INSERT OR UPDATE OF actual_hours, project_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_actual_hours();

-- Create trigger to update projects updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON projects;
CREATE TRIGGER trigger_update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle project deletion and task cleanup
CREATE OR REPLACE FUNCTION handle_project_deletion()
RETURNS trigger AS $$
BEGIN
  -- When a project is deleted, set project_id to NULL for all associated tasks
  -- This preserves the tasks but removes the project association
  UPDATE tasks 
  SET project_id = NULL, updated_at = now()
  WHERE project_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to handle project deletion
DROP TRIGGER IF EXISTS trigger_handle_project_deletion ON projects;
CREATE TRIGGER trigger_handle_project_deletion
  BEFORE DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_project_deletion();