CREATE TABLE public.editor_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.workspace_owner_id(auth.uid()),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'مشروع فيديو جديد',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  export_path text,
  thumb_path text,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editor_projects TO authenticated;
GRANT ALL ON public.editor_projects TO service_role;
ALTER TABLE public.editor_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace editor projects" ON public.editor_projects FOR ALL TO authenticated USING (owner_id = public.workspace_owner_id(auth.uid())) WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()));
CREATE INDEX editor_projects_owner_updated_idx ON public.editor_projects (owner_id, updated_at DESC);