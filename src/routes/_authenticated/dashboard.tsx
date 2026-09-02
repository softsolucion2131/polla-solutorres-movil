import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart3, X, Wallet, ArrowDownLeft, ArrowUpRight, Trophy, History, Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

type FilaDashboard = {
  userId: string;
  player: string;
  entries: number;
  exits: number;
  total: number;
  currentBalance: number;
  movements: number;
};

export default function Dashboard() {
  const { user, primaryRole, isAdmin, isAgency, loading } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-3xl">
          Hola, {user?.email?.split("@")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu rol actual:{" "}
          <span className="font-semibold text-accent">
            {loading ? "..." : primaryRole}
          </span>
        </p>
      </div>

      {/* VISTA SEGÚN EL ROL */}
      {isAgency && <AgencySummary />}
      {!isAdmin && !isAgency && <PlayerSummary />}

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            title="Panel Admin"
            desc="Gestiona agencias, bancos y usuarios de la plataforma."
          />
          <StatCard
            title="Control Operativo"
            desc="Hipódromos, programas oficiales y dividendos de carreras."
          />
        </div>
      )}
    </div>
  );
}

/* ====================================================================
   COMPONENTE: VISTA ESPECIAL PARA EL JUGADOR
   ==================================================================== */
function PlayerSummary() {
  const { user } = useAuth();

  // 1. Perfil del jugador (Saldo)
  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["player-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, pseudonimo, balance")
        .eq("id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // 2. Movimientos de la cuenta del jugador
  const { data: movimientos = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["player-movimientos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos_cuenta")
        .select("id, monto, tipo, descripcion, created_at, saldo_posterior")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Cálculos de Estadísticas
  const stats = useMemo(() => {
    let totalApostado = 0;
    let totalPremios = 0;

    for (const m of movimientos) {
      const monto = Math.abs(Number(m.monto ?? 0));
      const tipo = String(m.tipo || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();

      if (tipo === "DEBITO") totalApostado += monto;
      if (tipo === "PREMIO") totalPremios += monto;
    }

    return { totalApostado, totalPremios };
  }, [movimientos]);

  const saldoDisponible = Number(profile?.balance ?? movimientos[0]?.saldo_posterior ?? 0);

  return (
    <div className="space-y-6">
      {/* Botón Principal de Acción (A /pollas) */}
      <div className="flex justify-end">
        <Button asChild size="lg" className="gap-2 shadow-md">
          <Link to="/pollas">
            <Ticket className="h-5 w-5" /> Sellar Polla
          </Link>
        </Button>
      </div>

      {/* Tarjetas Principales del Jugador */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Disponible
            </CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-primary sm:text-3xl">
              Bs {fmt(saldoDisponible)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Disponible para sellar tus jugadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Premios Ganados
            </CardTitle>
            <Trophy className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground sm:text-3xl">
              Bs {fmt(stats.totalPremios)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Acreditados a tu cuenta</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Jugado
            </CardTitle>
            <History className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground sm:text-3xl">
              Bs {fmt(stats.totalApostado)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">En las últimas carreras</p>
          </CardContent>
        </Card>
      </div>

      {/* ACCESOS RÁPIDOS CORREGIDOS: /deposit y /withdraw */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" asChild className="h-14 justify-start gap-3 text-base">
          <Link to="/deposit">
            <div className="rounded-full bg-green-500/10 p-2 text-green-600">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">Recargar Saldo</span>
              <span className="text-xs text-muted-foreground">Reportar depósito o Pago Móvil</span>
            </div>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-14 justify-start gap-3 text-base">
          <Link to="/withdraw">
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">Solicitar Retiro</span>
              <span className="text-xs text-muted-foreground">Transferir saldo a tu cuenta bancaria</span>
            </div>
          </Link>
        </Button>
      </div>

      {/* Historial Reciente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Últimos Movimientos</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/estado-cuenta">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando tus movimientos...</p>
          ) : movimientos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aún no tienes registros de movimientos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto (Bs)</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => {
                  const monto = Number(m.monto ?? 0);
                  const tipoClean = String(m.tipo || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toUpperCase()
                    .trim();

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString("es-VE", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        {tipoClean === "DEPOSITO" && (
                          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600">
                            Depósito
                          </Badge>
                        )}
                        {tipoClean === "RETIRO" && (
                          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600">
                            Retiro
                          </Badge>
                        )}
                        {tipoClean === "DEBITO" && (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600">
                            Jugada
                          </Badge>
                        )}
                        {tipoClean === "PREMIO" && (
                          <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600">
                            Premio 🏆
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {m.descripcion || "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          monto > 0 ? "text-green-600" : "text-foreground"
                        }`}
                      >
                        {monto > 0 ? `+${fmt(monto)}` : fmt(monto)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-muted-foreground">
                        {m.saldo_posterior !== null ? fmt(Number(m.saldo_posterior)) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ====================================================================
   COMPONENTE: VISTA PARA LA AGENCIA
   ==================================================================== */
function AgencySummary() {
  const { user } = useAuth();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["agency-dashboard-direct", user?.id, desde, hasta],
    queryFn: async (): Promise<FilaDashboard[]> => {
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .maybeSingle();

      const agencyId = profile?.agency_id;
      if (!agencyId) return [];

      const { data: players, error: pErr } = await supabase
        .from("profiles")
        .select("id, name, email, pseudonimo")
        .eq("agency_id", agencyId);

      if (pErr) throw pErr;
      if (!players || players.length === 0) return [];

      const playerIds = players.map((p) => p.id);

      let q = supabase
        .from("movimientos_cuenta")
        .select("user_id, monto, tipo, saldo_posterior, created_at")
        .in("user_id", playerIds)
        .order("created_at", { ascending: true });

      if (desde.trim()) {
        q = q.gte("created_at", `${desde.trim()}T00:00:00.000Z`);
      }
      if (hasta.trim()) {
        q = q.lte("created_at", `${hasta.trim()}T23:59:59.999Z`);
      }

      const { data: movimientos, error: mErr } = await q;
      if (mErr) throw mErr;

      const map = new Map<string, FilaDashboard>();
      for (const p of players) {
        map.set(p.id, {
          userId: p.id,
          player: p.pseudonimo || p.name || p.email || "Jugador",
          entries: 0,
          exits: 0,
          total: 0,
          currentBalance: 0,
          movements: 0,
        });
      }

      for (const m of movimientos ?? []) {
        const row = map.get(m.user_id);
        if (!row) continue;

        const monto = Math.abs(Number(m.monto ?? 0));
        const tipo = String(m.tipo || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .trim();

        row.movements += 1;

        if (m.saldo_posterior !== null && m.saldo_posterior !== undefined) {
          row.currentBalance = Number(m.saldo_posterior);
        }

        if (tipo === "DEPOSITO") {
          row.entries += monto;
        } else if (tipo === "RETIRO") {
          row.exits += monto;
        }
      }

      return [...map.values()].map((r) => ({
        ...r,
        total: r.entries - r.exits,
      }));
    },
    enabled: !!user,
  });

  const entries = useMemo(() => rows.reduce((sum, r) => sum + r.entries, 0), [rows]);
  const exits = useMemo(() => rows.reduce((sum, r) => sum + r.exits, 0), [rows]);
  const totalCaja = entries - exits;
  const saldoJugadores = useMemo(() => rows.reduce((sum, r) => sum + r.currentBalance, 0), [rows]);

  const top = useMemo(
    () => rows.filter((r) => r.movements > 0 || r.currentBalance > 0).slice(0, 5),
    [rows]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="dashboard-desde">Desde</Label>
              <Input
                id="dashboard-desde"
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dashboard-hasta">Hasta</Label>
              <Input
                id="dashboard-hasta"
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            {(desde || hasta) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDesde("");
                  setHasta("");
                }}
                aria-label="Limpiar fechas"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="Depósitos Reales" value={entries} loading={isLoading} />
        <MiniCard title="Retiros Reales" value={exits} loading={isLoading} />
        <MiniCard title="Total Caja Real" value={totalCaja} loading={isLoading} highlight />
        <MiniCard title="Saldo de Jugadores" value={saldoJugadores} loading={isLoading} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Resumen por jugador</CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to="/agency/reporte">
              <BarChart3 className="mr-2 h-4 w-4" /> Ver reporte
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : error ? (
            <p className="text-sm text-destructive">
              Error obteniendo datos: {(error as Error)?.message}
            </p>
          ) : top.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay movimientos en el rango de fechas seleccionado.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {top.map((row) => (
                <li key={row.userId} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex flex-col">
                    <span className="truncate font-medium">{row.player}</span>
                    <span className="text-xs text-muted-foreground">
                      Saldo disponible: Bs {fmt(row.currentBalance)}
                    </span>
                  </div>
                  <span className="whitespace-nowrap text-muted-foreground">
                    Dep. {fmt(row.entries)} · Ret. {fmt(row.exits)} ·{" "}
                    <span className="font-semibold text-foreground">Total {fmt(row.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniCard({
  title,
  value,
  loading,
  highlight,
}: {
  title: string;
  value: number;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-lg font-bold sm:text-2xl ${
            highlight ? "text-primary" : ""
          }`}
        >
          {loading ? "..." : `Bs ${fmt(value)}`}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
