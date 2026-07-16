import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trophy, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pollas")({
  component: PollasPage,
});

const fmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Hipodromo = {
  idhip: string;
  nomhip: string;
  nrocaballos: number;
  cos_bol: number;
  porc_retener: number;
  porc_acumulado: number;
  acumulado: number;
  porc_primer_lugar: number;
  porc_segundo_lugar: number;
  porc_tercer_lugar: number;
};

type Carrera = {
  idprog: number;
  carrera: number;
  nrocab: number;
  horac: string | null;
  ejemplares: { nroejem: string; nombreeje: string | null; ret_ok: boolean }[];
};

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function PollasPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedHip, setSelectedHip] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<number, Set<string>>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fechac = todayISO();

  // Perfil (balance, agency_id)
  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["pollas-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("balance, agency_id")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  // Hipódromos con programa válido hoy
  const { data: hipodromos = [] } = useQuery({
    queryKey: ["pollas-hipodromos", fechac],
    queryFn: async () => {
      const { data: progs } = await supabase
        .from("programa")
        .select("idhip")
        .eq("fechac", fechac)
        .eq("valida_polla", true);
      const ids = Array.from(new Set((progs ?? []).map((p) => p.idhip)));
      if (ids.length === 0) return [] as Hipodromo[];
      const { data } = await supabase
        .from("hipodromos")
        .select("idhip,nomhip,nrocaballos,cos_bol,porc_retener,porc_acumulado,acumulado,porc_primer_lugar,porc_segundo_lugar,porc_tercer_lugar")
        .in("idhip", ids);
      return (data ?? []) as Hipodromo[];
    },
  });

  useEffect(() => {
    if (!selectedHip && hipodromos.length > 0) setSelectedHip(hipodromos[0].idhip);
  }, [hipodromos, selectedHip]);

  // Carreras válidas + ejemplares para el hipódromo seleccionado
  const { data: carreras = [] } = useQuery({
    enabled: !!selectedHip,
    queryKey: ["pollas-carreras", selectedHip, fechac],
    queryFn: async () => {
      const { data: progs } = await supabase
        .from("programa")
        .select("idprog,carrera,nrocab,horac,valida_polla,nro_valida")
        .eq("idhip", selectedHip!)
        .eq("fechac", fechac)
        .eq("valida_polla", true)
        .order("nro_valida", { ascending: true, nullsFirst: false })
        .order("carrera", { ascending: true });
      const list = progs ?? [];
      if (list.length === 0) return [] as Carrera[];
      const idprogs = list.map((p) => p.idprog);
      const { data: dets } = await supabase
        .from("detprog")
        .select("idprog,nroejem,nombreeje,ret_ok")
        .in("idprog", idprogs);
      return list.map((p) => ({
        idprog: p.idprog,
        carrera: p.carrera,
        nrocab: p.nrocab,
        horac: p.horac,
        ejemplares: (dets ?? [])
          .filter((d) => d.idprog === p.idprog)
          .sort((a, b) => Number(a.nroejem) - Number(b.nroejem)),
      })) as Carrera[];
    },
  });

  useEffect(() => {
    setSelections({});
  }, [selectedHip]);

  const hip = hipodromos.find((h) => h.idhip === selectedHip);
  const costo = Number(hip?.cos_bol ?? 0);

  const { combinaciones, seleccionadas, monto } = useMemo(() => {
    let combo = 1;
    let sel = 0;
    for (const c of carreras) {
      const n = selections[c.idprog]?.size ?? 0;
      if (n > 0) {
        combo *= n;
        sel += 1;
      }
    }
    const complete = carreras.length > 0 && sel === carreras.length;
    return {
      combinaciones: combo,
      seleccionadas: sel,
      monto: complete ? combo * costo : 0,
    };
  }, [carreras, selections, costo]);

  // Totales de jugadas del día para este hipódromo
  const { data: stats } = useQuery({
    enabled: !!selectedHip && !!hip,
    queryKey: ["pollas-stats", selectedHip, fechac, hip?.porc_retener, hip?.porc_acumulado, hip?.porc_primer_lugar, hip?.porc_segundo_lugar, hip?.porc_tercer_lugar, hip?.acumulado],
    queryFn: async () => {
      const { data } = await supabase
        .from("pollas")
        .select("monto")
        .eq("idhip", selectedHip!)
        .eq("fechac", fechac);
      const total = (data ?? []).reduce((s, r) => s + Number(r.monto), 0);
      const retencion = total * Number(hip?.porc_retener ?? 0) / 100;
      const aportAcum = total * Number(hip?.porc_acumulado ?? 0) / 100;
      const acumTotal = Number(hip?.acumulado ?? 0) + aportAcum;
      return {
        cantidad: data?.length ?? 0,
        total,
        retencion,
        acumulado: acumTotal,
        premio1: total * Number(hip?.porc_primer_lugar ?? 0) / 100,
        premio2: total * Number(hip?.porc_segundo_lugar ?? 0) / 100,
        premio3: total * Number(hip?.porc_tercer_lugar ?? 0) / 100,
      };
    },
  });

  // Últimas jugadas del jugador
  const { data: misJugadas = [] } = useQuery({
    enabled: !!user && !!selectedHip,
    queryKey: ["pollas-mias", user?.id, selectedHip, fechac],
    queryFn: async () => {
      const { data } = await supabase
        .from("pollas")
        .select("id,created_at,combinacion,puntos,lugar,premio,estado,monto")
        .eq("user_id", user!.id)
        .eq("idhip", selectedHip!)
        .eq("fechac", fechac)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const toggle = (idprog: number, nro: string, retirado: boolean) => {
    if (retirado) return;
    setSelections((prev) => {
      const next = { ...prev };
      const set = new Set(next[idprog] ?? []);
      if (set.has(nro)) set.delete(nro);
      else set.add(nro);
      next[idprog] = set;
      return next;
    });
  };

  const sellar = useMutation({
    mutationFn: async () => {
      if (!user || !hip) throw new Error("Sesión no válida");
      if (monto <= 0) throw new Error("Debes seleccionar al menos un ejemplar por carrera");
      if ((profile?.balance ?? 0) < monto) throw new Error("Saldo insuficiente");

      const combinacion = carreras.map((c) => ({
        carrera: c.carrera,
        nros: Array.from(selections[c.idprog] ?? []).sort(
          (a, b) => Number(a) - Number(b),
        ),
      }));

      const { error } = await supabase.from("pollas").insert({
        user_id: user.id,
        agency_id: profile?.agency_id ?? null,
        idhip: hip.idhip,
        fechac,
        combinacion,
        combinaciones,
        monto,
        estado: "proceso",
      });
      if (error) throw error;

      // Debitar saldo del jugador
      const { error: e2 } = await supabase
        .from("profiles")
        .update({ balance: Number(profile?.balance ?? 0) - monto })
        .eq("id", user.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Polla sellada correctamente");
      setSelections({});
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["pollas-mias"] });
      qc.invalidateQueries({ queryKey: ["pollas-stats"] });
      qc.invalidateQueries({ queryKey: ["pollas-profile"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo sellar la polla"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Sellar Polla</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona un ejemplar (o varios) por cada válida y sella tu jugada.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-2 text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Disponible</div>
          <div className="font-mono text-lg font-bold text-primary">
            Bs {fmt.format(Number(profile?.balance ?? 0))}
          </div>
        </div>
      </div>

      {/* Selector de hipódromos */}
      {hipodromos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hipodromos.map((h) => (
            <button
              key={h.idhip}
              onClick={() => setSelectedHip(h.idhip)}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                selectedHip === h.idhip
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent/20"
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              {h.nomhip}
            </button>
          ))}
        </div>
      )}

      {hipodromos.length === 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            No hay programa de polla disponible para hoy.
          </CardContent>
        </Card>
      )}

      {hip && (
        <>
          {/* Estadísticas */}
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Pollas jugadas" value={String(stats?.cantidad ?? 0)} />
            <StatCard label="1er Lugar" value={`Bs ${fmt.format(stats?.premio1 ?? 0)}`} />
            <StatCard label="2do Lugar" value={`Bs ${fmt.format(stats?.premio2 ?? 0)}`} />
            <StatCard label="3er Lugar" value={`Bs ${fmt.format(stats?.premio3 ?? 0)}`} />
          </div>

          {carreras.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay carreras marcadas como válidas de polla para este hipódromo.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {carreras.map((c, idx) => (
                  <Card key={c.idprog}>
                    <CardHeader className="flex flex-row items-center justify-between gap-3 py-3">
                      <CardTitle className="text-base">
                        <span className="text-primary">{idx + 1}ª Válida</span>{" "}
                        <span className="text-muted-foreground">· Carrera {c.carrera}</span>
                      </CardTitle>
                      {c.horac && (
                        <span className="text-xs text-muted-foreground">{c.horac}</span>
                      )}
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                        {c.ejemplares.map((e) => {
                          const active = selections[c.idprog]?.has(e.nroejem) ?? false;
                          return (
                            <button
                              key={e.nroejem}
                              disabled={e.ret_ok}
                              onClick={() => toggle(c.idprog, e.nroejem, e.ret_ok)}
                              title={e.nombreeje ?? ""}
                              className={`flex h-10 items-center justify-center rounded-md border font-mono text-sm font-bold transition-all ${
                                e.ret_ok
                                  ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                                  : active
                                    ? "border-primary bg-primary text-primary-foreground scale-105"
                                    : "border-border bg-card hover:border-primary/50"
                              }`}
                            >
                              {e.ret_ok ? "R" : e.nroejem}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Total y sellar */}
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {seleccionadas}/{carreras.length} válidas · {combinaciones} combinaciones · Bs {fmt.format(costo)} c/u
                    </div>
                    <div className="font-display text-3xl font-bold">
                      Bs {fmt.format(monto)}
                    </div>
                  </div>
                  <Button
                    size="lg"
                    disabled={monto <= 0}
                    onClick={() => setConfirmOpen(true)}
                  >
                    SELLAR TICKET
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Últimas jugadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas jugadas</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Hora</th>
                    <th className="py-2 pr-3">Combinación</th>
                    <th className="py-2 pr-3 text-right">Monto</th>
                    <th className="py-2 pr-3 text-right">Pts</th>
                    <th className="py-2 pr-3 text-right">Lugar</th>
                    <th className="py-2 pr-3 text-right">Premio</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {misJugadas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No hay jugadas registradas para este evento
                      </td>
                    </tr>
                  )}
                  {misJugadas.map((j) => (
                    <tr key={j.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-mono text-xs">
                        {new Date(j.created_at).toLocaleTimeString("es-VE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {(j.combinacion as any[])
                          .map((c) => `${c.carrera}:[${c.nros.join(",")}]`)
                          .join("  ")}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">
                        {fmt.format(Number(j.monto))}
                      </td>
                      <td className="py-2 pr-3 text-right">{j.puntos}</td>
                      <td className="py-2 pr-3 text-right">{j.lugar ?? "-"}</td>
                      <td className="py-2 pr-3 text-right font-mono">
                        {Number(j.premio) > 0 ? fmt.format(Number(j.premio)) : "-"}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                            j.estado === "pagado"
                              ? "bg-green-500/20 text-green-500"
                              : j.estado === "ganador"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : j.estado === "perdedor"
                                  ? "bg-red-500/20 text-red-500"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {j.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar jugada</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {carreras.map((c, idx) => {
              const nros = Array.from(selections[c.idprog] ?? []).sort(
                (a, b) => Number(a) - Number(b),
              );
              return (
                <div
                  key={c.idprog}
                  className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="text-primary">{idx + 1}ª Válida</span>
                  <span className="font-mono font-bold">{nros.join(", ") || "---"}</span>
                </div>
              );
            })}
            <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10 p-3 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                Monto a debitar
              </div>
              <div className="font-display text-2xl font-bold">Bs {fmt.format(monto)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Editar
            </Button>
            <Button
              disabled={sellar.isPending}
              onClick={() => sellar.mutate()}
            >
              {sellar.isPending ? "Sellando..." : "Confirmar y sellar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold">{value}</div>
    </div>
  );
}
