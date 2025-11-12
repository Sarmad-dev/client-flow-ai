/*
  # Update RLS Policies for Tasks, Task Comments, Time Entries, and Task Assignments
  
  This migration updates Row Level Security policies to work with the profiles table
  instead of directly referencing auth.users.
  
  Key changes:
  1. Tasks RLS - Check access via profiles (tasks.user_id may reference profiles.id)
  2. Task Comments RLS - Check access via profiles (task_comments.user_id references auth.users)
  3. Time Entries RLS - Check access via profiles (time_entries.user_id references auth.users)
  4. Task Assignments RLS - Check access via profiles (task_assignments references profiles.id directly)
*/

-- Drop existing policies for tasks
DROP POLICY IF EXISTS "Users can read own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Drop existing policies for task_comments
DROP POLICY IF EXISTS "Users can read comments for their tasks or assigned tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can add comments to their tasks or assigned tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;

-- Drop existing policies for time_entries
DROP POLICY IF EXISTS "Users can read time entries for their tasks" ON time_entries;
DROP POLICY IF EXISTS "Users can manage their own time entries" ON time_entries;

-- Drop existing policies for task_assignments
DROP POLICY IF EXISTS "Users can read assignments for their tasks" ON task_assignments;
DROP POLICY IF EXISTS "Task owners can manage assignments" ON task_assignments;

-- Drop existing policies for task_dependencies (they also reference tasks)
DROP POLICY IF EXISTS "Users can read dependencies for their tasks" ON task_dependencies;
DROP POLICY IF EXISTS "Users can manage dependencies for their tasks" ON task_dependencies;

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================
-- Tasks: Check if the current user's profile owns the task
-- This handles both cases: tasks.user_id referencing profiles.id directly
-- or tasks.user_id referencing auth.users(id) via profiles.user_id

-- Users can read tasks they own (via profile) or are assigned to
CREATE POLICY "Users can read own tasks or assigned tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user owns the task via their profile
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        -- Case 1: tasks.user_id references profiles.id directly
        tasks.user_id = p.id
        OR
        -- Case 2: tasks.user_id references auth.users(id), check via profiles.user_id
        tasks.user_id = p.user_id
      )
    )
    OR
    -- Check if user is assigned to the task
    EXISTS (
      SELECT 1 FROM task_assignments ta
      JOIN public.profiles p ON ta.user_id = p.id
      WHERE ta.task_id = tasks.id
      AND p.user_id = auth.uid()
    )
  );

-- Users can insert tasks they own (via profile)
CREATE POLICY "Users can insert own tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        tasks.user_id = p.id
        OR
        tasks.user_id = p.user_id
      )
    )
  );

-- Users can update tasks they own (via profile)
CREATE POLICY "Users can update own tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        tasks.user_id = p.id
        OR
        tasks.user_id = p.user_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        tasks.user_id = p.id
        OR
        tasks.user_id = p.user_id
      )
    )
  );

-- Users can delete tasks they own (via profile)
CREATE POLICY "Users can delete own tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        tasks.user_id = p.id
        OR
        tasks.user_id = p.user_id
      )
    )
  );

-- ============================================================================
-- TASK COMMENTS POLICIES
-- ============================================================================
-- Task Comments: task_comments.user_id references auth.users(id)
-- Check access via profiles.user_id

-- Users can read comments for tasks they own or are assigned to
CREATE POLICY "Users can read comments for their tasks or assigned tasks"
  ON task_comments
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user owns the task
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = task_comments.task_id
      AND p.user_id = auth.uid()
    )
    OR
    -- Check if user is assigned to the task
    EXISTS (
      SELECT 1 FROM task_assignments ta
      JOIN public.profiles p ON ta.user_id = p.id
      WHERE ta.task_id = task_comments.task_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can add comments to tasks they own or are assigned to
CREATE POLICY "Users can add comments to their tasks or assigned tasks"
  ON task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check that the comment is being created by the current user (via profile)
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        task_comments.user_id = p.user_id
        OR
        task_comments.user_id = p.id
      )
    )
    AND (
      -- Check if user owns the task
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN public.profiles p ON (
          t.user_id = p.id OR t.user_id = p.user_id
        )
        WHERE t.id = task_comments.task_id
        AND p.user_id = auth.uid()
      )
      OR
      -- Check if user is assigned to the task
      EXISTS (
        SELECT 1 FROM task_assignments ta
        JOIN public.profiles p ON ta.user_id = p.id
        WHERE ta.task_id = task_comments.task_id
        AND p.user_id = auth.uid()
      )
    )
  );

-- Users can update their own comments (check via profile)
CREATE POLICY "Users can update their own comments"
  ON task_comments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        task_comments.user_id = p.user_id
        OR
        task_comments.user_id = p.id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        task_comments.user_id = p.user_id
        OR
        task_comments.user_id = p.id
      )
    )
  );

-- Users can delete their own comments (check via profile)
CREATE POLICY "Users can delete their own comments"
  ON task_comments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        task_comments.user_id = p.user_id
        OR
        task_comments.user_id = p.id
      )
    )
  );

-- ============================================================================
-- TIME ENTRIES POLICIES
-- ============================================================================
-- Time Entries: time_entries.user_id references auth.users(id)
-- Check access via profiles.user_id

-- Users can read time entries for their tasks or their own time entries
CREATE POLICY "Users can read time entries for their tasks"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (
    -- Check if it's the user's own time entry (via profile)
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        time_entries.user_id = p.user_id
        OR
        time_entries.user_id = p.id
      )
    )
    OR
    -- Check if user owns the task
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = time_entries.task_id
      AND p.user_id = auth.uid()
    )
  );

-- Users can manage their own time entries (check via profile)
CREATE POLICY "Users can manage their own time entries"
  ON time_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        time_entries.user_id = p.user_id
        OR
        time_entries.user_id = p.id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND (
        time_entries.user_id = p.user_id
        OR
        time_entries.user_id = p.id
      )
    )
  );

-- ============================================================================
-- TASK ASSIGNMENTS POLICIES
-- ============================================================================
-- Task Assignments: task_assignments.user_id and assigned_by reference profiles(id) directly

-- Users can read assignments for tasks they own or assignments they are part of
CREATE POLICY "Users can read assignments for their tasks"
  ON task_assignments
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is the assignee (via profile)
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND task_assignments.user_id = p.id
    )
    OR
    -- Check if user owns the task
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = task_assignments.task_id
      AND p.user_id = auth.uid()
    )
  );

-- Task owners can manage assignments (check via profile)
CREATE POLICY "Task owners can manage assignments"
  ON task_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = task_assignments.task_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = task_assignments.task_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TASK DEPENDENCIES POLICIES
-- ============================================================================
-- Task Dependencies: Reference tasks, so check via tasks policies

-- Users can read dependencies for their tasks
CREATE POLICY "Users can read dependencies for their tasks"
  ON task_dependencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE (
        t.id = task_dependencies.task_id
        OR
        t.id = task_dependencies.depends_on_task_id
      )
      AND p.user_id = auth.uid()
    )
  );

-- Users can manage dependencies for their tasks
CREATE POLICY "Users can manage dependencies for their tasks"
  ON task_dependencies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = task_dependencies.task_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN public.profiles p ON (
        t.user_id = p.id OR t.user_id = p.user_id
      )
      WHERE t.id = task_dependencies.task_id
      AND p.user_id = auth.uid()
    )
  );

