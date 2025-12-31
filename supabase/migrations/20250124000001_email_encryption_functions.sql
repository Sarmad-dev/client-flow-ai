-- Email Encryption Helper Functions
-- Provides database functions to support email encryption migration

BEGIN;

-- Function to migrate user emails to encrypted format
-- This marks emails as needing encryption when first accessed by client
CREATE OR REPLACE FUNCTION public.migrate_emails_to_encrypted(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer := 0;
  v_result json;
BEGIN
  -- Verify the user is requesting their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only migrate own emails';
  END IF;

  -- Update emails that need encryption
  UPDATE public.email_communications 
  SET needs_encryption = true
  WHERE user_id = p_user_id
    AND direction = 'received'
    AND (body_text IS NOT NULL OR body_html IS NOT NULL OR subject IS NOT NULL)
    AND (needs_encryption IS NULL OR needs_encryption = false);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Return migration summary
  v_result := json_build_object(
    'user_id', p_user_id,
    'emails_marked_for_encryption', v_updated_count,
    'migration_completed_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to get encryption statistics for a user
CREATE OR REPLACE FUNCTION public.get_encryption_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_emails integer := 0;
  v_needs_encryption integer := 0;
  v_encrypted_emails integer := 0;
  v_result json;
BEGIN
  -- Verify the user is requesting their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only view own encryption stats';
  END IF;

  -- Count total emails
  SELECT COUNT(*) INTO v_total_emails
  FROM public.email_communications
  WHERE user_id = p_user_id;

  -- Count emails needing encryption
  SELECT COUNT(*) INTO v_needs_encryption
  FROM public.email_communications
  WHERE user_id = p_user_id
    AND needs_encryption = true;

  -- Count emails that are encrypted (don't need encryption)
  SELECT COUNT(*) INTO v_encrypted_emails
  FROM public.email_communications
  WHERE user_id = p_user_id
    AND (needs_encryption = false OR needs_encryption IS NULL);

  -- Build result
  v_result := json_build_object(
    'user_id', p_user_id,
    'total_emails', v_total_emails,
    'needs_encryption', v_needs_encryption,
    'encrypted_emails', v_encrypted_emails,
    'encryption_percentage', 
      CASE 
        WHEN v_total_emails > 0 THEN 
          ROUND((v_encrypted_emails::decimal / v_total_emails::decimal) * 100, 2)
        ELSE 0 
      END,
    'checked_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to batch mark emails as encrypted after client-side encryption
CREATE OR REPLACE FUNCTION public.mark_emails_encrypted(p_email_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer := 0;
  v_result json;
BEGIN
  -- Update emails to mark as encrypted (only user's own emails)
  UPDATE public.email_communications 
  SET needs_encryption = false
  WHERE id = ANY(p_email_ids)
    AND user_id = auth.uid();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Return update summary
  v_result := json_build_object(
    'user_id', auth.uid(),
    'emails_marked_encrypted', v_updated_count,
    'requested_count', array_length(p_email_ids, 1),
    'updated_at', now()
  );

  RETURN v_result;
END;
$$;

-- Function to clean up old unencrypted email content (use with caution)
-- This is for future use when migrating from plain text to encrypted storage
CREATE OR REPLACE FUNCTION public.cleanup_unencrypted_content(p_user_id uuid, p_confirm_cleanup boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleaned_count integer := 0;
  v_result json;
BEGIN
  -- Verify the user is requesting their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only cleanup own emails';
  END IF;

  -- Safety check - require explicit confirmation
  IF NOT p_confirm_cleanup THEN
    RAISE EXCEPTION 'Cleanup requires explicit confirmation. Set p_confirm_cleanup to true.';
  END IF;

  -- This function is for future use - currently just returns stats
  -- In a real migration, this would clear plain text content after encryption
  SELECT COUNT(*) INTO v_cleaned_count
  FROM public.email_communications
  WHERE user_id = p_user_id
    AND needs_encryption = false
    AND (body_text IS NOT NULL OR body_html IS NOT NULL);

  -- Return cleanup summary (no actual cleanup performed yet)
  v_result := json_build_object(
    'user_id', p_user_id,
    'emails_ready_for_cleanup', v_cleaned_count,
    'cleanup_performed', false,
    'note', 'Cleanup function is prepared but not yet implemented for safety',
    'checked_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_emails_to_encrypted(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_encryption_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_emails_encrypted(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_unencrypted_content(uuid, boolean) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.migrate_emails_to_encrypted(uuid) IS 
  'Marks user emails as needing client-side encryption on next access';

COMMENT ON FUNCTION public.get_encryption_stats(uuid) IS 
  'Returns encryption statistics for a user''s emails';

COMMENT ON FUNCTION public.mark_emails_encrypted(uuid[]) IS 
  'Marks specified emails as encrypted after client-side encryption is complete';

COMMENT ON FUNCTION public.cleanup_unencrypted_content(uuid, boolean) IS 
  'Future function for cleaning up plain text content after encryption migration';

COMMIT;