ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'none';
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

CREATE OR REPLACE FUNCTION public.member_subscription_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(_user_id, 'owner') OR EXISTS (
    SELECT 1 FROM public.team_members WHERE member_id = _user_id AND status = 'active'
      AND (subscription_ends_at IS NULL OR subscription_ends_at > now()))
$$;

CREATE OR REPLACE FUNCTION public.my_subscription()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object('plan', tm.plan, 'ends_at', tm.subscription_ends_at, 'active', public.member_subscription_active(auth.uid()))
  FROM (SELECT 1) x LEFT JOIN public.team_members tm ON tm.member_id = auth.uid() AND tm.role <> 'owner' AND tm.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.my_workspace_access()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'owner') THEN
      '{"studio":true,"library":true,"team":true,"models":true,"show_model_names":true}'::jsonb
    WHEN NOT public.member_subscription_active(auth.uid()) THEN '{"expired":true}'::jsonb
    ELSE COALESCE(
      (SELECT permissions FROM public.team_members WHERE member_id = auth.uid() AND status = 'active' ORDER BY created_at LIMIT 1),
      '{}'::jsonb)
  END
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _max int; _maxmin numeric; _used int;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;
  IF NOT public.member_subscription_active(auth.uid()) THEN
    RAISE EXCEPTION 'انتهى اشتراكك، تواصل معنا عبر واتساب للتجديد';
  END IF;
  SELECT max_videos, max_minutes_per_video INTO _max, _maxmin FROM public.team_members
    WHERE member_id = auth.uid() AND role <> 'owner' AND status = 'active' LIMIT 1;
  IF _maxmin IS NOT NULL AND COALESCE(NEW.duration_minutes, 0) > _maxmin THEN
    RAISE EXCEPTION 'مدة الفيديو تتجاوز الحد المسموح (% دقيقة)', _maxmin;
  END IF;
  IF _max IS NOT NULL THEN
    SELECT count(*) INTO _used FROM public.video_projects WHERE created_by = auth.uid() AND status <> 'draft' AND id <> NEW.id;
    IF _used >= _max THEN RAISE EXCEPTION 'وصلت إلى الحد الأقصى لعدد الفيديوهات (%)', _max; END IF;
  END IF;
  RETURN NEW;
END $function$;