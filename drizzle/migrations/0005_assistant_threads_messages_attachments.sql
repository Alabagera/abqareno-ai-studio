CREATE TABLE public.assistant_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.workspace_owner_id(auth.uid()),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'محادثة جديدة',
  mode text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_threads TO authenticated;
GRANT ALL ON public.assistant_threads TO service_role;
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace assistant threads" ON public.assistant_threads FOR ALL TO authenticated USING (owner_id = public.workspace_owner_id(auth.uid())) WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()));

CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL DEFAULT '',
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assistant_messages_role_check CHECK (role IN ('user', 'assistant'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace assistant messages" ON public.assistant_messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.owner_id = public.workspace_owner_id(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.owner_id = public.workspace_owner_id(auth.uid())));

CREATE TABLE public.assistant_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.assistant_messages(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, asset_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_attachments TO authenticated;
GRANT ALL ON public.assistant_attachments TO service_role;
ALTER TABLE public.assistant_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace assistant attachments" ON public.assistant_attachments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.owner_id = public.workspace_owner_id(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.owner_id = public.workspace_owner_id(auth.uid())));

CREATE INDEX assistant_threads_owner_updated_idx ON public.assistant_threads (owner_id, updated_at DESC);
CREATE INDEX assistant_messages_thread_created_idx ON public.assistant_messages (thread_id, created_at);
CREATE INDEX assistant_attachments_thread_idx ON public.assistant_attachments (thread_id);