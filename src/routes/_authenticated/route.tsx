import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, Building2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, isAdmin, isAgency, primaryRole, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary" />
          <span className="font-display text-lg font-bold">Turf Bet</span>
        </Link>

        <nav className="flex flex-col gap-1 text-sm">
          <NavLink to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>

          {isAdmin && (
            <>
              <div className="mt-4 px-3 text-xs uppercase tracking-widest text-muted-foreground">Admin</div>
              <NavLink to="/admin/agencies" icon={<Building2 className="h-4 w-4" />}>Agencias</NavLink>
              <NavLink to="/admin/users" icon={<Users className="h-4 w-4" />}>Usuarios y roles</NavLink>
            </>
          )}

          {isAgency && (
            <>
              <div className="mt-4 px-3 text-xs uppercase tracking-widest text-muted-foreground">Agencia</div>
              <NavLink to="/dashboard" icon={<ShieldCheck className="h-4 w-4" />}>Mi panel</NavLink>
            </>
          )}
        </nav>

        <div className="mt-auto rounded-lg border border-border bg-card p-3 text-xs">
          <div className="truncate font-semibold text-foreground">{user?.email}</div>
          <div className="mt-1 inline-block rounded bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">
            {loading ? "..." : primaryRole}
          </div>
          <Button size="sm" variant="ghost" onClick={handleSignOut} className="mt-3 w-full justify-start gap-2">
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </div>
      </aside>

      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavLink({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
    >
      {icon}
      {children}
    </Link>
  );
}
