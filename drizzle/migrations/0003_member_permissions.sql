CREATE OR REPLACE FUNCTION public.my_workspace_access()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'owner') THEN
      '{"studio":true,"library":true,"team":true,"models":true,"show_model_names":true}'::jsonb
    ELSE COALESCE(
      (SELECT permissions FROM public.team_members WHERE member_id = auth.uid() AND status = 'active' ORDER BY created_at LIMIT 1),
      '{}'::jsonb
    )
  END
$$;
GRANT EXECUTE ON FUNCTION public.my_workspace_access() TO authenticated;