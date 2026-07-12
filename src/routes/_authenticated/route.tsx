import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Users, Building2, ShieldCheck, Wallet, ListChecks, Inbox, Banknote, HandCoins, Trophy, Percent } from "lucide-react";

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
  const { user, isAdmin, isAgency, isPlayer, primaryRole, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // Fetch profile to get agency_id (for agency filter + pending badge)
  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("agency_id").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  // Pending count badge for agency users
  const { data: pendingCount = 0 } = useQuery({
    enabled: !!user && isAgency && !!profile?.agency_id,
    queryKey: ["agency-pending-count", profile?.agency_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("transfers")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", profile!.agency_id!)
        .eq("status", "pendiente");
      return count ?? 0;
    },
    refetchInterval: 15000,
  });

  const { data: pendingWithdrawals = 0 } = useQuery({
    enabled: !!user && isAgency && !!profile?.agency_id,
    queryKey: ["agency-pending-withdrawals", profile?.agency_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", profile!.agency_id!)
        .eq("status", "pendiente");
      return count ?? 0;
    },
    refetchInterval: 15000,
  });

  // Realtime notifications
  const shownRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (isPlayer) {
      const ch = supabase
        .channel(`player-transfers-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "transfers", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const key = `p-${payload.new.id}-${payload.new.status}`;
            if (shownRef.current.has(key)) return;
            shownRef.current.add(key);
            const status = payload.new.status;
            const ref = payload.new.reference;
            if (status === "aprobado") toast.success(`Tu depósito ${ref} fue aprobado ✅`);
            else if (status === "rechazado") toast.error(`Tu depósito ${ref} fue rechazado`);
            qc.invalidateQueries({ queryKey: ["my-deposits"] });
          },
        )
        .subscribe();
      channels.push(ch);

      const chw = supabase
        .channel(`player-withdrawals-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const key = `pw-${payload.new.id}-${payload.new.status}`;
            if (shownRef.current.has(key)) return;
            shownRef.current.add(key);
            const status = payload.new.status;
            const amt = Number(payload.new.amount).toFixed(2);
            if (status === "aprobado") toast.success(`Tu retiro de Bs ${amt} fue aprobado ✅`);
            else if (status === "rechazado") toast.error(`Tu retiro de Bs ${amt} fue rechazado`);
            qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
          },
        )
        .subscribe();
      channels.push(chw);
    }

    if (isAgency && profile?.agency_id) {
      const ch = supabase
        .channel(`agency-transfers-${profile.agency_id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "transfers", filter: `agency_id=eq.${profile.agency_id}` },
          (payload) => {
            const key = `a-${payload.new.id}`;
            if (shownRef.current.has(key)) return;
            shownRef.current.add(key);
            toast.info(`Nuevo depósito recibido: Bs ${Number(payload.new.amount).toFixed(2)} (ref ${payload.new.reference})`);
            qc.invalidateQueries({ queryKey: ["agency-deposits"] });
            qc.invalidateQueries({ queryKey: ["agency-pending-count"] });
          },
        )
        .subscribe();
      channels.push(ch);

      const chw = supabase
        .channel(`agency-withdrawals-${profile.agency_id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "withdrawals", filter: `agency_id=eq.${profile.agency_id}` },
          (payload) => {
            const key = `aw-${payload.new.id}`;
            if (shownRef.current.has(key)) return;
            shownRef.current.add(key);
            toast.info(`Nueva solicitud de retiro: Bs ${Number(payload.new.amount).toFixed(2)}`);
            qc.invalidateQueries({ queryKey: ["agency-withdrawals"] });
            qc.invalidateQueries({ queryKey: ["agency-pending-withdrawals"] });
          },
        )
        .subscribe();
      channels.push(chw);
    }

    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [user, isPlayer, isAgency, profile?.agency_id, qc]);

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

          {isPlayer && !isAdmin && !isAgency && (
            <>
              <div className="mt-4 px-3 text-xs uppercase tracking-widest text-muted-foreground">Jugador</div>
              <NavLink to="/deposit" icon={<Wallet className="h-4 w-4" />}>Depositar</NavLink>
              <NavLink to="/my-deposits" icon={<ListChecks className="h-4 w-4" />}>Mis depósitos</NavLink>
              <NavLink to="/withdraw" icon={<HandCoins className="h-4 w-4" />}>Retirar</NavLink>
              <NavLink to="/my-withdrawals" icon={<Banknote className="h-4 w-4" />}>Mis retiros</NavLink>
            </>
          )}

          {isAgency && (
            <>
              <div className="mt-4 px-3 text-xs uppercase tracking-widest text-muted-foreground">Agencia</div>
              <NavLink
                to="/agency/deposits"
                icon={<Inbox className="h-4 w-4" />}
                badge={pendingCount > 0 ? pendingCount : undefined}
              >
                Depósitos
              </NavLink>
              <NavLink
                to="/agency/withdrawals"
                icon={<Banknote className="h-4 w-4" />}
                badge={pendingWithdrawals > 0 ? pendingWithdrawals : undefined}
              >
                Retiros
              </NavLink>
              <NavLink to="/agency/dividendos" icon={<Percent className="h-4 w-4" />}>Dividendos</NavLink>
              <NavLink to="/dashboard" icon={<ShieldCheck className="h-4 w-4" />}>Mi panel</NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <div className="mt-4 px-3 text-xs uppercase tracking-widest text-muted-foreground">Admin</div>
              <NavLink to="/admin/agencies" icon={<Building2 className="h-4 w-4" />}>Agencias</NavLink>
              <NavLink to="/admin/hipodromos" icon={<Trophy className="h-4 w-4" />}>Hipódromos</NavLink>
              <NavLink to="/admin/users" icon={<Users className="h-4 w-4" />}>Usuarios y roles</NavLink>
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

function NavLink({
  to, icon, children, badge,
}: { to: string; icon: React.ReactNode; children: React.ReactNode; badge?: number }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-primary" }}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-yellow-500/30 px-1.5 text-[10px] font-bold text-yellow-500">{badge}</span>
      )}
    </Link>
  );
}
