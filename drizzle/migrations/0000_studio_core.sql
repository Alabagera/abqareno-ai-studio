CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL,
  name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets" ON public.media_assets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.video_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  script_text text,
  avatar_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  audio_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  voice_model text NOT NULL DEFAULT 'xtts-v2',
  avatar_model text NOT NULL DEFAULT 'sadtalker',
  language text NOT NULL DEFAULT 'ar',
  subtitles_enabled boolean NOT NULL DEFAULT true,
  subtitle_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  translate_to text,
  status text NOT NULL DEFAULT 'draft',
  output_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_projects TO authenticated;
GRANT ALL ON public.video_projects TO service_role;
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.video_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "media read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);