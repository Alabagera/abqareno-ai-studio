CREATE TABLE public.model_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  endpoint_url text NOT NULL DEFAULT '',
  access_token text,
  enabled boolean NOT NULL DEFAULT false,
  last_status text,
  last_checked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, model_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_endpoints TO authenticated;
GRANT ALL ON public.model_endpoints TO service_role;
ALTER TABLE public.model_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own model endpoints" ON public.model_endpoints
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'))
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'));