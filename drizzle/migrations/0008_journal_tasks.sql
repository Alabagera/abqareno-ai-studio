CREATE TABLE public.journal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  notes text NOT NULL DEFAULT '',
  repeat text NOT NULL DEFAULT 'daily' CHECK (repeat IN ('daily','weekly','monthly','yearly')),
  remind_at timestamptz,
  tone text NOT NULL DEFAULT 'chime',
  tone_path text,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_tasks TO authenticated;
GRANT ALL ON public.journal_tasks TO service_role;
ALTER TABLE public.journal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal tasks" ON public.journal_tasks FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());