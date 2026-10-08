import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Clapperboard, FolderOpen, Cpu, LogOut, UserRoundCog, Users, Bot, Film, Megaphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const nav = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, permission: null },
  { to: "/studio", label: "الاستوديو", icon: Clapperboard, permission: "studio" },
  { to: "/editor", label: "المحرر", icon: Film, permission: "editor" },
  { to: "/assistant", label: "المساعد", icon: Bot, permission: "assistant" },
  { to: "/ads", label: "الإعلانات", icon: Megaphone, permission: "ads" },
  { to: "/library", label: "المكتبة", icon: FolderOpen, permission: "library" },
  { to: "/profiles", label: "هويتي", icon: UserRoundCog, permission: "studio" },
  { to: "/team", label: "الفريق", icon: Users, permission: "team" },
  { to: "/models", label: "النماذج", icon: Cpu, permission: "models" },
] as const;

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { data: access, isPending: accessPending } = useQuery({ queryKey: ["workspace-access", user?.id], enabled: Boolean(user), queryFn: async () => (await supabase.rpc("my_workspace_access")).data as Record<string, boolean> | null });
  // Editor/assistant/ads follow the studio permission until the owner sets them.
  const can = (perm: string | null) => perm === null || access?.[perm] === true || (["editor", "assistant", "ads"].includes(perm) && access?.[perm] === undefined && access?.["studio"] === true);
  const visibleNav = nav.filter((item) => can(item.permission));
  const requiredPermission = nav.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))?.permission;
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) return <div className="grid min-h-dvh place-items-center text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 rounded-none border-y-0 border-s-0 p-5 md:flex">
        <div className="mb-6 flex items-center justify-between"><Logo /><ThemeToggle /></div>
        {visibleNav.map((n) => (
          <Link key={n.to} to={n.to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground" activeProps={{ className: "bg-secondary !text-gold" }}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        ))}
        <div className="mt-auto space-y-2">
          <p className="truncate text-xs text-muted-foreground" dir="ltr">{user.email}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={() => supabase.auth.signOut()}>
            <LogOut /> تسجيل الخروج
          </Button>
        </div>
      </aside>

      <header className="flex items-center justify-between px-4 py-4 md:hidden">
        <Logo />
        <div className="flex gap-1"><ThemeToggle /><Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} aria-label="خروج"><LogOut /></Button></div>
      </header>

      <main className="min-w-0 flex-1 px-3 pb-28 sm:px-4 md:px-10 md:py-8 md:pb-10">
        {accessPending ? <div className="grid min-h-48 place-items-center text-muted-foreground">جارٍ تحميل صلاحياتك…</div> : access && requiredPermission && !can(requiredPermission) ? <div className="glass rounded-2xl p-8 text-center text-muted-foreground">لم يمنحك المدير صلاحية استخدام هذه الصفحة.</div> : <Outlet />}
      </main>

      <nav className="glass fixed inset-x-2 bottom-2 z-40 flex justify-between overflow-x-auto rounded-2xl p-1 md:hidden" style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}>
        {visibleNav.map((n) => (
          <Link key={n.to} to={n.to} className="flex min-w-[3.25rem] flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] text-muted-foreground" activeProps={{ className: "bg-secondary !text-gold" }}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
