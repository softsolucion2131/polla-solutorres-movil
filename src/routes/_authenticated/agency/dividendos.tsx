import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agency/dividendos")({
  component: DividendosPage,
});

type Dividendo = {
  id_div: number;
  idhip: string;
  idage: number;
  desde: number; hasta: number; fijo: number; adicional: number; divfijo: number;
  fijod: number; adicionald: number;
  desdep: number; hastap: number; fijop: number; adicionalp: number; divfijop: number;
  desdes: number; hastas: number; fijos: number; adicionals: number; divfijos: number;
};

type Bet = "win" | "place" | "show";

const FIELDS: Record<Bet, { desde: keyof Dividendo; hasta: keyof Dividendo; fijo: keyof Dividendo; adicional: keyof Dividendo; divfijo: keyof Dividendo }> = {
  win:   { desde: "desde",  hasta: "hasta",  fijo: "fijo",  adicional: "adicional",  divfijo: "divfijo"  },
  place: { desde: "desdep", hasta: "hastap", fijo: "fijop", adicional: "adicionalp", divfijo: "divfijop" },
  show:  { desde: "desdes", hasta: "hastas", fijo: "fijos", adicional: "adicionals", divfijo: "divfijos" },
};

function DividendosPage() {
  const { user, isAdmin, isAgency, loading } = useAuth();
  const qc = useQueryClient();
  const [selectedHip, setSelectedHip] = useState<string>("");
  const [tab, setTab] = useState<Bet>("win");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dividendo | null>(null);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile-agency", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("agency_id").eq("id", user!.id).maybeSingle();
      return data;
    },
  });
  const agencyId = profile?.agency_id ?? null;

  const { data: hipodromos = [] } = useQuery({
    queryKey: ["hipodromos-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hipodromos").select("idhip,nomhip,activo").order("nomhip");
      if (error) throw error;
      return data as { idhip: string; nomhip: string; activo: boolean }[];
    },
  });

  const { data: rows = [], isLoading } = useQuery({
    enabled: !!agencyId && !!selectedHip,
    queryKey: ["dividendos", agencyId, selectedHip],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dividendos")
        .select("*")
        .eq("idage", agencyId!)
        .eq("idhip", selectedHip)
        .order("id_div");
      if (error) throw error;
      return data as Dividendo[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ values, id }: { values: Partial<Dividendo>; id?: number }) => {
      if (id) {
        const { error } = await supabase.from("dividendos").update(values).eq("id_div", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("dividendos").insert({
          idage: agencyId!, idhip: selectedHip, ...values,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dividendos", agencyId, selectedHip] });
      setOpen(false); setEditing(null);
      toast.success("Configuración guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("dividendos").delete().eq("id_div", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dividendos", agencyId, selectedHip] });
      toast.success("Rango eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = FIELDS[tab];
  const visibleRows = useMemo(
    () => rows.filter((r) => Number(r[f.desde]) !== 0 || Number(r[f.hasta]) !== 0 || Number(r[f.fijo]) !== 0 || Number(r[f.adicional]) !== 0 || Number(r[f.divfijo]) !== 0),
    [rows, f],
  );

  if (loading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAgency && !isAdmin) return <div className="text-destructive">No tienes permiso para ver esta sección.</div>;
  if (!agencyId) return <div className="text-destructive">Tu perfil no tiene agencia asignada.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración de dividendos</h1>
        <p className="text-sm text-muted-foreground">Define los rangos de pago por hipódromo para tu agencia.</p>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Seleccionar hipódromo</Label>
              <Select value={selectedHip} onValueChange={setSelectedHip}>
                <SelectTrigger><SelectValue placeholder="Elige un hipódromo" /></SelectTrigger>
                <SelectContent>
                  {hipodromos.map((h) => (
                    <SelectItem key={h.idhip} value={h.idhip}>
                      {h.nomhip.trim()} ({h.idhip})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedHip && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Rangos de dividendos</CardTitle>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditing(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo rango
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? "Editar rango" : "Nuevo rango"}</DialogTitle>
                </DialogHeader>
                <DividendoForm
                  initial={editing}
                  onSubmit={(v) => saveMutation.mutate({ values: v, id: editing?.id_div })}
                  submitting={saveMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as Bet)}>
              <TabsList>
                <TabsTrigger value="win">WIN</TabsTrigger>
                <TabsTrigger value="place">PLACE</TabsTrigger>
                <TabsTrigger value="show">SHOW</TabsTrigger>
              </TabsList>

              {(["win", "place", "show"] as Bet[]).map((t) => (
                <TabsContent key={t} value={t} className="mt-4">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  ) : visibleRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay rangos configurados para {t.toUpperCase()}.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nro</TableHead>
                            <TableHead>Desde</TableHead>
                            <TableHead>Hasta</TableHead>
                            <TableHead>Tope pago (divfijo)</TableHead>
                            <TableHead>Monto fijo</TableHead>
                            <TableHead>Adicional %</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleRows.map((r, i) => (
                            <TableRow key={r.id_div}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>{Number(r[f.desde]).toFixed(2)}</TableCell>
                              <TableCell>{Number(r[f.hasta]).toFixed(2)}</TableCell>
                              <TableCell>{Number(r[f.divfijo]).toFixed(2)}</TableCell>
                              <TableCell>{Number(r[f.fijo]).toFixed(2)}</TableCell>
                              <TableCell>{Number(r[f.adicional]).toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { if (confirm("¿Eliminar este rango?")) deleteMutation.mutate(r.id_div); }}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DividendoForm({
  initial, onSubmit, submitting,
}: {
  initial: Dividendo | null;
  onSubmit: (values: Partial<Dividendo>) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const keys: (keyof Dividendo)[] = [
      "desde","hasta","fijo","adicional","divfijo","fijod","adicionald",
      "desdep","hastap","fijop","adicionalp","divfijop",
      "desdes","hastas","fijos","adicionals","divfijos",
    ];
    const o: Record<string, string> = {};
    keys.forEach((k) => { o[k] = String(initial?.[k] ?? 0); });
    return o;
  });

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const num = (k: string) => Number(values[k] || 0);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const out: Partial<Dividendo> = {};
    Object.keys(values).forEach((k) => { (out as Record<string, number>)[k] = num(k); });
    onSubmit(out);
  };

  const Section = ({ title, prefix }: { title: string; prefix: "" | "p" | "s" }) => {
    const fields = [
      { key: `desde${prefix}`, label: "Desde" },
      { key: `hasta${prefix}`, label: "Hasta" },
      { key: `fijo${prefix}`, label: "Monto fijo" },
      { key: `adicional${prefix}`, label: "Adicional %" },
      { key: `divfijo${prefix}`, label: "Tope pago (divfijo)" },
    ];
    return (
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`d-${f.key}`} className="text-xs">{f.label}</Label>
              <Input
                id={`d-${f.key}`}
                type="number"
                step="0.01"
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handle} className="space-y-5">
      <Section title="WIN" prefix="" />
      <Section title="PLACE" prefix="p" />
      <Section title="SHOW" prefix="s" />
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
