import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Clapperboard, FolderOpen, Cpu, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

const nav = [
  { to: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/studio", label: "الاستوديو", icon: Clapperboard },
  { to: "/library", label: "المكتبة", icon: FolderOpen },
  { to: "/models", label: "النماذج", icon: Cpu },
] as const;

function Layout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) return <div className="grid min-h-dvh place-items-center text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="glass sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 rounded-none border-y-0 border-s-0 p-5 md:flex">
        <div className="mb-6"><Logo /></div>
        {nav.map((n) => (
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
        <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} aria-label="خروج"><LogOut /></Button>
      </header>

      <main className="flex-1 px-4 pb-28 md:px-10 md:py-8 md:pb-10">
        <Outlet />
      </main>

      <nav className="glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl p-1.5 md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] text-muted-foreground" activeProps={{ className: "bg-secondary !text-gold" }}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
