CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_id uuid,
  email text NOT NULL,
  display_name text,
  role public.app_role NOT NULL DEFAULT 'editor',
  permissions jsonb NOT NULL DEFAULT '{"studio": true, "library": true, "team": false}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, email),
  UNIQUE (owner_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.workspace_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.team_members WHERE member_id = _user_id AND status = 'active' ORDER BY created_at LIMIT 1),
    _user_id
  )
$$;
GRANT EXECUTE ON FUNCTION public.workspace_owner_id(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_primary_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  IF _user_id IS NULL OR _email <> 'alabagera2024@gmail.com' THEN
    RETURN false;
  END IF;
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (_user_id, _email, 'Alabagera')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.team_members (owner_id, member_id, email, display_name, role, permissions, status)
  VALUES (_user_id, _user_id, _email, 'Alabagera', 'owner', '{"studio": true, "library": true, "team": true}'::jsonb, 'active')
  ON CONFLICT (owner_id, email) DO UPDATE SET member_id = EXCLUDED.member_id, role = 'owner', status = 'active', updated_at = now();
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.bootstrap_primary_owner() TO authenticated;

CREATE POLICY "profiles visible to workspace" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR id = public.workspace_owner_id(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.team_members tm WHERE tm.owner_id = auth.uid() AND tm.member_id = profiles.id
));
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
CREATE POLICY "roles read own" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "team members read workspace" ON public.team_members FOR SELECT TO authenticated
USING (owner_id = public.workspace_owner_id(auth.uid()) OR member_id = auth.uid());
CREATE POLICY "team owner manages members" ON public.team_members FOR ALL TO authenticated
USING (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'))
WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(), 'owner'));

ALTER TABLE public.media_assets ALTER COLUMN user_id SET DEFAULT public.workspace_owner_id(auth.uid());
DROP POLICY "own assets" ON public.media_assets;
CREATE POLICY "workspace assets" ON public.media_assets FOR ALL TO authenticated
USING (user_id = public.workspace_owner_id(auth.uid()))
WITH CHECK (user_id = public.workspace_owner_id(auth.uid()));

ALTER TABLE public.video_projects ALTER COLUMN user_id SET DEFAULT public.workspace_owner_id(auth.uid());
DROP POLICY "own projects" ON public.video_projects;
CREATE POLICY "workspace projects" ON public.video_projects FOR ALL TO authenticated
USING (user_id = public.workspace_owner_id(auth.uid()))
WITH CHECK (user_id = public.workspace_owner_id(auth.uid()));

DROP POLICY "media read own" ON storage.objects;
DROP POLICY "media insert own" ON storage.objects;
DROP POLICY "media delete own" ON storage.objects;
CREATE POLICY "media read workspace" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = public.workspace_owner_id(auth.uid())::text);
CREATE POLICY "media insert workspace" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = public.workspace_owner_id(auth.uid())::text);
CREATE POLICY "media delete workspace" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = public.workspace_owner_id(auth.uid())::text);

CREATE TABLE public.avatar_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.workspace_owner_id(auth.uid()),
  name text NOT NULL,
  image_asset_ids uuid[] NOT NULL DEFAULT '{}',
  cover_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  model text NOT NULL DEFAULT 'sadtalker',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avatar_profiles TO authenticated;
GRANT ALL ON public.avatar_profiles TO service_role;
ALTER TABLE public.avatar_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace avatars" ON public.avatar_profiles FOR ALL TO authenticated
USING (owner_id = public.workspace_owner_id(auth.uid()))
WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()));

CREATE TABLE public.voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.workspace_owner_id(auth.uid()),
  name text NOT NULL,
  sample_asset_ids uuid[] NOT NULL DEFAULT '{}',
  primary_sample_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  model text NOT NULL DEFAULT 'xtts-v2',
  enhancement jsonb NOT NULL DEFAULT '{"clarity": 100, "noise_reduction": 100, "studio_quality": true}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_profiles TO authenticated;
GRANT ALL ON public.voice_profiles TO service_role;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace voices" ON public.voice_profiles FOR ALL TO authenticated
USING (owner_id = public.workspace_owner_id(auth.uid()))
WITH CHECK (owner_id = public.workspace_owner_id(auth.uid()));

ALTER TABLE public.video_projects
  ADD COLUMN avatar_profile_id uuid REFERENCES public.avatar_profiles(id) ON DELETE SET NULL,
  ADD COLUMN voice_profile_id uuid REFERENCES public.voice_profiles(id) ON DELETE SET NULL,
  ADD COLUMN background_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  ADD COLUMN logo_asset_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  ADD COLUMN title_overlay jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN text_overlays jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN translation_style jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN logo_style jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX team_members_member_id_idx ON public.team_members(member_id);
CREATE INDEX team_members_owner_id_idx ON public.team_members(owner_id);
CREATE INDEX avatar_profiles_owner_id_idx ON public.avatar_profiles(owner_id);
CREATE INDEX voice_profiles_owner_id_idx ON public.voice_profiles(owner_id);