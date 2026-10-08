-- Each account sees only its own content; the main owner sees everything in the workspace.
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.avatar_profiles ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.voice_profiles ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
UPDATE public.media_assets SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.avatar_profiles SET created_by = owner_id WHERE created_by IS NULL;
UPDATE public.voice_profiles SET created_by = owner_id WHERE created_by IS NULL;
UPDATE public.video_projects SET created_by = user_id WHERE created_by IS NULL;

CREATE OR REPLACE FUNCTION public.can_see_content(_owner uuid, _creator uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner = public.workspace_owner_id(auth.uid())
    AND (_creator = auth.uid() OR (public.has_role(auth.uid(), 'owner') AND _owner = auth.uid()))
$$;

CREATE OR REPLACE FUNCTION public.can_manage_models()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'owner') OR EXISTS (
    SELECT 1 FROM public.team_members WHERE member_id = auth.uid() AND status = 'active' AND (permissions->>'models') = 'true')
$$;

DROP POLICY IF EXISTS "workspace assets" ON public.media_assets;
CREATE POLICY "personal assets" ON public.media_assets FOR ALL TO authenticated
  USING (public.can_see_content(user_id, created_by)) WITH CHECK (user_id = public.workspace_owner_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workspace editor projects" ON public.editor_projects;
CREATE POLICY "personal editor projects" ON public.editor_projects FOR ALL TO authenticated
  USING (public.can_see_content(owner_id, created_by)) WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workspace projects" ON public.video_projects;
CREATE POLICY "personal video projects" ON public.video_projects FOR ALL TO authenticated
  USING (public.can_see_content(user_id, created_by)) WITH CHECK (user_id = public.workspace_owner_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workspace avatars" ON public.avatar_profiles;
CREATE POLICY "personal avatars" ON public.avatar_profiles FOR ALL TO authenticated
  USING (public.can_see_content(owner_id, created_by)) WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workspace voices" ON public.voice_profiles;
CREATE POLICY "personal voices" ON public.voice_profiles FOR ALL TO authenticated
  USING (public.can_see_content(owner_id, created_by)) WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workspace assistant threads" ON public.assistant_threads;
CREATE POLICY "personal assistant threads" ON public.assistant_threads FOR ALL TO authenticated
  USING (public.can_see_content(owner_id, created_by)) WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "workspace assistant messages" ON public.assistant_messages;
CREATE POLICY "personal assistant messages" ON public.assistant_messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND public.can_see_content(t.owner_id, t.created_by)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND public.can_see_content(t.owner_id, t.created_by)));

DROP POLICY IF EXISTS "workspace assistant attachments" ON public.assistant_attachments;
CREATE POLICY "personal assistant attachments" ON public.assistant_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND public.can_see_content(t.owner_id, t.created_by)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND public.can_see_content(t.owner_id, t.created_by)));

-- Members with the models permission manage the owner's shared model servers.
DROP POLICY IF EXISTS "Owner manages own model endpoints" ON public.model_endpoints;
CREATE POLICY "Model managers manage workspace endpoints" ON public.model_endpoints FOR ALL TO authenticated
  USING (owner_id = public.workspace_owner_id(auth.uid()) AND public.can_manage_models())
  WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()) AND public.can_manage_models());