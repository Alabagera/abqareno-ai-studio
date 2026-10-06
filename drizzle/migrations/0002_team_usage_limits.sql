ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS max_videos integer, ADD COLUMN IF NOT EXISTS max_minutes_per_video numeric;
ALTER TABLE public.video_projects ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid(), ADD COLUMN IF NOT EXISTS duration_minutes numeric, ADD COLUMN IF NOT EXISTS aspect_ratio text NOT NULL DEFAULT '9:16', ADD COLUMN IF NOT EXISTS platform text;

CREATE OR REPLACE FUNCTION public.my_usage()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'max_videos', tm.max_videos,
    'max_minutes_per_video', tm.max_minutes_per_video,
    'used', (SELECT count(*) FROM public.video_projects vp WHERE vp.created_by = auth.uid() AND vp.status <> 'draft')
  )
  FROM (SELECT 1) x LEFT JOIN public.team_members tm ON tm.member_id = auth.uid() AND tm.role <> 'owner' AND tm.status = 'active'
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.my_usage() TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_video_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max int; _maxmin numeric; _used int;
BEGIN
  IF NEW.status = 'draft' THEN RETURN NEW; END IF;
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
END $$;
DROP TRIGGER IF EXISTS video_limits ON public.video_projects;
CREATE TRIGGER video_limits BEFORE INSERT OR UPDATE OF status, duration_minutes ON public.video_projects FOR EACH ROW EXECUTE FUNCTION public.enforce_video_limits();