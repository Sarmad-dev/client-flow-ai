/*
  # Task Collaboration Functions

  This migration adds helper functions for task collaboration features:
  1. Function to check if a user has access to a task
  2. Function to get task activity timeline
  3. Function to get collaboration metrics
*/

-- Function to check if a user has access to a task (owns it or is assigned to it)
CREATE OR REPLACE FUNCTION check_task_access(task_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user owns the task
  IF EXISTS (
    SELECT 1 FROM tasks 
    WHERE id = task_id AND tasks.user_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to the task
  IF EXISTS (
    SELECT 1 FROM task_assignments 
    WHERE task_assignments.task_id = task_id AND task_assignments.user_id = user_id
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get task activity timeline
CREATE OR REPLACE FUNCTION get_task_activity(p_task_id uuid, limit_count integer DEFAULT 50)
RETURNS TABLE (
  activity_type text,
  activity_data jsonb,
  user_id uuid,
  user_email text,
  user_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  WITH task_activities AS (
    -- Task status changes (from task updates)
    -- tasks.user_id references auth.users(id), so join profiles via profiles.user_id
    SELECT 
      'status_change' as activity_type,
      jsonb_build_object(
        'old_status', lag(status) OVER (ORDER BY tasks.updated_at),
        'new_status', status,
        'task_title', title
      ) as activity_data,
      profile.id as user_id,
      COALESCE(profile.email::text, '') as user_email,
      COALESCE(profile.full_name::text, profile.email::text, '') as user_name,
      tasks.updated_at as created_at
    FROM tasks
    LEFT JOIN public.profiles profile ON tasks.user_id = profile.id
    WHERE tasks.id = p_task_id
    
    UNION ALL
    
    -- Comments
    -- task_comments.user_id references auth.users(id), so join profiles via profiles.user_id
    SELECT 
      'comment' as activity_type,
      jsonb_build_object(
        'content', content,
        'comment_id', task_comments.id
      ) as activity_data,
      profile.id as user_id,
      COALESCE(profile.email::text, '') as user_email,
      COALESCE(profile.full_name::text, profile.email::text, '') as user_name,
      task_comments.created_at
    FROM task_comments
    LEFT JOIN public.profiles profile ON task_comments.user_id = profile.user_id
    WHERE task_comments.task_id = p_task_id
    
    UNION ALL
    
    -- Assignments
    -- task_assignments.user_id and assigned_by reference profiles(id) directly
    SELECT 
      'assignment' as activity_type,
      jsonb_build_object(
        'assigned_user_id', task_assignments.user_id,
        'assigned_user_email', COALESCE(assigned_profile.email::text, ''),
        'assigned_user_name', COALESCE(assigned_profile.full_name::text, assigned_profile.email::text, ''),
        'assignment_id', task_assignments.id
      ) as activity_data,
      task_assignments.assigned_by as user_id,
      COALESCE(assigned_by_profile.email::text, '') as user_email,
      COALESCE(assigned_by_profile.full_name::text, assigned_by_profile.email::text, '') as user_name,
      task_assignments.created_at as created_at
    FROM task_assignments
    LEFT JOIN public.profiles assigned_by_profile ON task_assignments.assigned_by = assigned_by_profile.id
    LEFT JOIN public.profiles assigned_profile ON task_assignments.user_id = assigned_profile.id
    WHERE task_assignments.task_id = p_task_id
    
    UNION ALL
    
    -- Time entries
    -- time_entries.user_id references auth.users(id), so join profiles via profiles.user_id
    SELECT 
      'time_entry' as activity_type,
      jsonb_build_object(
        'duration_minutes', duration_minutes,
        'description', description,
        'is_manual', is_manual,
        'time_entry_id', time_entries.id
      ) as activity_data,
      profile.id as user_id,
      COALESCE(profile.email::text, '') as user_email,
      COALESCE(profile.full_name::text, profile.email::text, '') as user_name,
      time_entries.created_at
    FROM time_entries
    LEFT JOIN public.profiles profile ON time_entries.user_id = profile.user_id
    WHERE time_entries.task_id = p_task_id
    AND time_entries.end_time IS NOT NULL -- Only completed time entries
  )
  SELECT 
    ta.activity_type,
    ta.activity_data,
    ta.user_id,
    ta.user_email,
    ta.user_name,
    ta.created_at
  FROM task_activities ta
  ORDER BY ta.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaboration metrics for a user
CREATE OR REPLACE FUNCTION get_collaboration_metrics(user_id uuid, date_range_days integer DEFAULT 30)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  start_date timestamptz;
BEGIN
  start_date := now() - (date_range_days || ' days')::interval;
  
  WITH metrics AS (
    SELECT 
      -- Tasks owned by user
      (SELECT COUNT(*) FROM tasks WHERE tasks.user_id = user_id AND created_at >= start_date) as owned_tasks,
      
      -- Tasks assigned to user
      (SELECT COUNT(*) FROM task_assignments WHERE task_assignments.user_id = user_id AND assigned_at >= start_date) as assigned_tasks,
      
      -- Comments made by user
      (SELECT COUNT(*) FROM task_comments WHERE task_comments.user_id = user_id AND created_at >= start_date) as comments_made,
      
      -- Tasks with comments from user
      (SELECT COUNT(DISTINCT task_id) FROM task_comments WHERE task_comments.user_id = user_id AND created_at >= start_date) as tasks_commented_on,
      
      -- Active collaborators (users who have interacted with user's tasks)
      (SELECT COUNT(DISTINCT tc.user_id) 
       FROM task_comments tc 
       JOIN tasks t ON tc.task_id = t.id 
       WHERE t.user_id = user_id 
       AND tc.user_id != user_id 
       AND tc.created_at >= start_date) as active_collaborators,
      
      -- Average response time to comments (in hours)
      (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (response.created_at - original.created_at)) / 3600), 0)
       FROM task_comments original
       JOIN task_comments response ON original.task_id = response.task_id
       JOIN tasks t ON original.task_id = t.id
       WHERE t.user_id = user_id
       AND original.user_id != user_id
       AND response.user_id = user_id
       AND response.created_at > original.created_at
       AND original.created_at >= start_date) as avg_response_time_hours
  )
  SELECT jsonb_build_object(
    'owned_tasks', owned_tasks,
    'assigned_tasks', assigned_tasks,
    'comments_made', comments_made,
    'tasks_commented_on', tasks_commented_on,
    'active_collaborators', active_collaborators,
    'avg_response_time_hours', ROUND(avg_response_time_hours::numeric, 2),
    'date_range_days', date_range_days,
    'calculated_at', now()
  ) INTO result
  FROM metrics;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shared tasks for a user (tasks they don't own but are assigned to)
CREATE OR REPLACE FUNCTION get_shared_tasks(user_id uuid)
RETURNS TABLE (
  task_id uuid,
  title text,
  description text,
  status text,
  priority text,
  due_date timestamptz,
  owner_id uuid,
  owner_email text,
  owner_name text,
  assigned_at timestamptz,
  progress_percentage integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.due_date,
    t.user_id as owner_id,
    u.email::text as owner_email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email::text) as owner_name,
    ta.assigned_at,
    t.progress_percentage
  FROM task_assignments ta
  JOIN tasks t ON ta.task_id = t.id
  LEFT JOIN auth.users u ON t.user_id = u.id
  WHERE ta.user_id = user_id
  AND t.user_id != user_id -- Exclude tasks owned by the user
  ORDER BY ta.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_task_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_activity(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_collaboration_metrics(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shared_tasks(uuid) TO authenticated;