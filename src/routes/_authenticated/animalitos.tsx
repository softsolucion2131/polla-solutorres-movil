import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trash2, Ticket, Wallet, Clock, CheckCheck, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/animalitos")({
  component: AnimalitosPage,
  head: () => ({
    meta: [
      { title: "Venta de animalitos | Polla Hípica" },
      {
        name: "description",
        content:
          "Vende y juega animalitos: elige lotería, sorteos del día, animales y montos. Valida tu saldo y genera el ticket al instante.",
      },
      { property: "og:title", content: "Venta de animalitos | Polla Hípica" },
      {
        property: "og:description",
        content: "Selecciona lotería, sorteos y animales, valida tu saldo y genera el ticket.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const hora12 = (t: string) => {
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  const suf = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${mm} ${suf}`;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

function AnimalitosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [sortId, setSortId] = useState<number | null>(null);
  const [horas, setHoras] = useState<number[]>([]);
  const [jugadas, setJugadas] = useState<{ animal_id: number; amount: string }[]>([]);
  const [montoRapido, setMontoRapido] = useState("");

  const { data: sorts = [] } = useQuery({
    queryKey: ["an-sorts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sorts").select("id, name, pay_per_100").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeSortId = sortId ?? sorts[0]?.id ?? null;
  const activeSort = sorts.find((s) => s.id === activeSortId);

  const { data: animales = [] } = useQuery({
    enabled: !!activeSortId,
    queryKey: ["an-animals", activeSortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animals")
        .select("id, code, name")
        .eq("sort_id", activeSortId!)
        .order("id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sorteos = [] } = useQuery({
    enabled: !!activeSortId,
    queryKey: ["an-daily", activeSortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_sort")
        .select("id, time")
        .eq("sort_id", activeSortId!)
        .order("time");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: resultados = [] } = useQuery({
    enabled: sorteos.length > 0,
    queryKey: ["an-results", activeSortId, todayISO()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("results")
        .select("daily_sort_id, animal_id, created_at, animals(code, name)")
        .in(
          "daily_sort_id",
          sorteos.map((s) => s.id),
        )
        .gte("created_at", `${todayISO()}T00:00:00`);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["an-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, balance")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: misTickets = [] } = useQuery({
    enabled: !!user,
    queryKey: ["an-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, public_id, status, created_at, ticket_animals(amount, animals(code, name))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saldo = Number(profile?.balance ?? 0);
  const resultadoPorSorteo = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of resultados as any[]) {
      if (r.animals) m.set(r.daily_sort_id, `${r.animals.name} ${r.animals.code}`);
    }
    return m;
  }, [resultados]);

  const animalById = useMemo(() => new Map(animales.map((a) => [a.id, a])), [animales]);

  const totalJugadas = jugadas.reduce((s, j) => s + (Number(j.amount) || 0), 0);
  const total = totalJugadas * (horas.length || 0);
  const saldoInsuficiente = total > saldo;

  const toggleHora = (id: number) =>
    setHoras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAnimal = (animalId: number) => {
    setJugadas((prev) =>
      prev.some((j) => j.animal_id === animalId)
        ? prev.filter((j) => j.animal_id !== animalId)
        : [...prev, { animal_id: animalId, amount: montoRapido || "" }],
    );
  };

  const setMonto = (animalId: number, amount: string) =>
    setJugadas((prev) => prev.map((j) => (j.animal_id === animalId ? { ...j, amount } : j)));

  const limpiar = () => {
    setJugadas([]);
    setHoras([]);
  };

  const vender = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("vender_animalitos", {
        p_sort_id: activeSortId!,
        p_daily_sort_ids: horas,
        p_jugadas: jugadas.map((j) => ({ animal_id: j.animal_id, amount: Number(j.amount) })),
      });
      if (error) throw error;
      return data as { public_id: string; total: number; saldo_restante: number };
    },
    onSuccess: (res) => {
      toast.success(`Ticket ${res.public_id} generado por Bs ${fmt(Number(res.total))}`);
      limpiar();
      qc.invalidateQueries({ queryKey: ["an-profile"] });
      qc.invalidateQueries({ queryKey: ["an-tickets"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo generar el ticket"),
  });

  const puedeVender =
    !!activeSortId &&
    horas.length > 0 &&
    jugadas.length > 0 &&
    jugadas.every((j) => Number(j.amount) > 0) &&
    !saldoInsuficiente;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Loterías y animalitos</h1>
          <p className="text-sm text-muted-foreground">
            Apuesta a un animal específico. Paga {activeSort?.pay_per_100 ?? 30} x 1
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={activeSortId ? String(activeSortId) : undefined}
            onValueChange={(v) => {
              setSortId(Number(v));
              limpiar();
            }}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecciona lotería" />
            </SelectTrigger>
            <SelectContent>
              {sorts.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Bs {fmt(saldo)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_320px]">
        {/* Sorteos del día */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" /> Sorteos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ScrollArea className="h-[420px] pr-2">
              <div className="space-y-1.5">
                {sorteos.map((s) => {
                  const activo = horas.includes(s.id);
                  const res = resultadoPorSorteo.get(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleHora(s.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                        activo
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <span>{hora12(s.time)}</span>
                      {res ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {res}
                        </Badge>
                      ) : activo ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : null}
                    </button>
                  );
                })}
                {sorteos.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin sorteos configurados.</p>
                )}
              </div>
            </ScrollArea>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setHoras(horas.length === sorteos.length ? [] : sorteos.map((s) => s.id))
              }
            >
              {horas.length === sorteos.length && sorteos.length > 0
                ? "Quitar todos"
                : "Seleccionar todos"}
            </Button>
          </CardContent>
        </Card>

        {/* Grid de animales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Animalitos</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Monto rápido</span>
              <Input
                value={montoRapido}
                onChange={(e) => setMontoRapido(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Bs"
                className="h-8 w-24"
                inputMode="decimal"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-9">
              {animales.map((a) => {
                const sel = jugadas.some((j) => j.animal_id === a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAnimal(a.id)}
                    className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-center transition ${
                      sel ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="text-sm font-bold tabular-nums">{a.code}</span>
                    <span className="line-clamp-1 text-[11px] text-muted-foreground">{a.name}</span>
                  </button>
                );
              })}
              {animales.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground">
                  Esta lotería no tiene animalitos cargados.
                </p>
              )}
            </div>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Apuesta a un animal específico, paga {activeSort?.pay_per_100 ?? 30} x 1
            </p>
          </CardContent>
        </Card>

        {/* Ticket */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ticket className="h-4 w-4" /> Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <ScrollArea className="h-[300px] pr-2">
              <div className="space-y-2">
                {jugadas.map((j) => {
                  const a = animalById.get(j.animal_id);
                  return (
                    <div key={j.animal_id} className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm">
                        {a?.code} … {a?.name}
                      </span>
                      <Input
                        value={j.amount}
                        onChange={(e) => setMonto(j.animal_id, e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="Monto"
                        className="h-8 w-24"
                        inputMode="decimal"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => toggleAnimal(j.animal_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                {jugadas.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selecciona animalitos y sorteos para armar tu ticket.
                  </p>
                )}
              </div>
            </ScrollArea>

            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Jugadas</span>
                <span>{jugadas.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Sorteos</span>
                <span>{horas.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2 text-base font-bold text-primary">
                <span>Total</span>
                <span>Bs {fmt(total)}</span>
              </div>
              {saldoInsuficiente && (
                <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <X className="h-3 w-3" /> Saldo insuficiente (disponible Bs {fmt(saldo)})
                </p>
              )}
            </div>

            <div className="mt-auto space-y-2">
              <Button
                className="h-11 w-full bg-amber-500 text-base font-bold text-amber-950 hover:bg-amber-600"
                disabled={!puedeVender || vender.isPending}
                onClick={() => vender.mutate()}
              >
                {vender.isPending ? "Generando…" : "GENERAR TICKET"}
              </Button>
              <Button variant="outline" className="w-full" onClick={limpiar}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Últimos tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {misTickets.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no has generado tickets.</p>
          )}
          {(misTickets as any[]).map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="text-sm font-semibold">{t.public_id}</div>
              <div className="flex flex-wrap gap-1">
                {(t.ticket_animals ?? []).map((ta: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-[11px]">
                    {ta.animals?.code} · Bs {fmt(Number(ta.amount))}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(t.created_at).toLocaleString("es-VE")}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
