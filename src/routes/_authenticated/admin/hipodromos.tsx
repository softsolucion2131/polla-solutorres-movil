import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/hipodromos")({
  component: HipodromosPage,
});

type Hipodromo = {
  idhip: string;
  nomhip: string;
  activo: boolean;
  nrocarreras: number;
  nrocaballos: number;
  acumulado: number;
  porc_retener: number;
  porc_primer_lugar: number;
  porc_segundo_lugar: number;
  porc_tercer_lugar: number;
  porc_acumulado: number;
  cos_bol: number;
  divmax: number;
  empate: number;
  tipo: number;
  venxcar: number;
};

const schema = z.object({
  idhip: z.string().trim().min(1, "Código requerido").max(6, "Máximo 6 caracteres"),
  nomhip: z.string().trim().min(2, "Nombre muy corto").max(50),
  activo: z.boolean(),
  nrocarreras: z.coerce.number().int().min(0).max(50),
  nrocaballos: z.coerce.number().int().min(0).max(30),
  acumulado: z.coerce.number().min(0),
  porc_retener: z.coerce.number().min(0).max(100),
  porc_primer_lugar: z.coerce.number().min(0).max(100),
  porc_segundo_lugar: z.coerce.number().min(0).max(100),
  porc_tercer_lugar: z.coerce.number().min(0).max(100),
  porc_acumulado: z.coerce.number().min(0).max(100),
  cos_bol: z.coerce.number().min(0),
  divmax: z.coerce.number().min(0),
  empate: z.coerce.number().min(0),
  tipo: z.coerce.number().int().min(0),
  venxcar: z.coerce.number().min(0),
});

type FormValues = z.infer<typeof schema>;

const TIPO_LABEL: Record<number, string> = { 0: "Nacional", 1: "Internacional" };

function HipodromosPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hipodromo | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["hipodromos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hipodromos").select("*").order("nomhip");
      if (error) throw error;
      return data as Hipodromo[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ values, originalId }: { values: FormValues; originalId?: string }) => {
      if (originalId) {
        const { error } = await supabase.from("hipodromos").update(values).eq("idhip", originalId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hipodromos").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hipodromos"] });
      setOpen(false); setEditing(null);
      toast.success("Hipódromo guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (idhip: string) => {
      const { error } = await supabase.from("hipodromos").delete().eq("idhip", idhip);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hipodromos"] });
      toast.success("Hipódromo eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAdmin) return <div className="text-destructive">No tienes permiso para ver esta sección.</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hipódromos</h1>
          <p className="text-sm text-muted-foreground">Administra los hipódromos y sus parámetros.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo hipódromo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar hipódromo" : "Nuevo hipódromo"}</DialogTitle>
            </DialogHeader>
            <HipodromoForm
              initial={editing}
              onSubmit={(values) => saveMutation.mutate({ values, originalId: editing?.idhip })}
              submitting={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Listado</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando hipódromos...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay hipódromos. Crea el primero.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Carreras</TableHead>
                    <TableHead>Caballos</TableHead>
                    <TableHead>% Retener</TableHead>
                    <TableHead>Acumulado</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((h) => (
                    <TableRow key={h.idhip}>
                      <TableCell className="font-mono">{h.idhip}</TableCell>
                      <TableCell className="font-medium">{h.nomhip}</TableCell>
                      <TableCell>{TIPO_LABEL[h.tipo] ?? h.tipo}</TableCell>
                      <TableCell>{h.nrocarreras}</TableCell>
                      <TableCell>{h.nrocaballos}</TableCell>
                      <TableCell>{Number(h.porc_retener).toFixed(2)}%</TableCell>
                      <TableCell>{Number(h.acumulado).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={h.activo ? "text-primary" : "text-muted-foreground"}>
                          {h.activo ? "Sí" : "No"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(h); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { if (confirm(`¿Eliminar "${h.nomhip}"?`)) deleteMutation.mutate(h.idhip); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HipodromoForm({
  initial, onSubmit, submitting,
}: {
  initial: Hipodromo | null;
  onSubmit: (values: FormValues) => void;
  submitting: boolean;
}) {
  const [idhip, setIdhip] = useState(initial?.idhip ?? "");
  const [nomhip, setNomhip] = useState(initial?.nomhip ?? "");
  const [activo, setActivo] = useState<boolean>(initial?.activo ?? true);
  const [tipo, setTipo] = useState<string>(String(initial?.tipo ?? 0));
  const [nrocarreras, setNrocarreras] = useState(String(initial?.nrocarreras ?? 10));
  const [nrocaballos, setNrocaballos] = useState(String(initial?.nrocaballos ?? 8));
  const [acumulado, setAcumulado] = useState(String(initial?.acumulado ?? 0));
  const [porcRetener, setPorcRetener] = useState(String(initial?.porc_retener ?? 0));
  const [porc1, setPorc1] = useState(String(initial?.porc_primer_lugar ?? 0));
  const [porc2, setPorc2] = useState(String(initial?.porc_segundo_lugar ?? 0));
  const [porc3, setPorc3] = useState(String(initial?.porc_tercer_lugar ?? 0));
  const [porcAcum, setPorcAcum] = useState(String(initial?.porc_acumulado ?? 0));
  const [cosBol, setCosBol] = useState(String(initial?.cos_bol ?? 100));
  const [divmax, setDivmax] = useState(String(initial?.divmax ?? 0));
  const [empate, setEmpate] = useState(String(initial?.empate ?? 0));
  const [venxcar, setVenxcar] = useState(String(initial?.venxcar ?? 0));

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      idhip: idhip.trim().toUpperCase(),
      nomhip,
      activo,
      tipo,
      nrocarreras,
      nrocaballos,
      acumulado,
      porc_retener: porcRetener,
      porc_primer_lugar: porc1,
      porc_segundo_lugar: porc2,
      porc_tercer_lugar: porc3,
      porc_acumulado: porcAcum,
      cos_bol: cosBol,
      divmax,
      empate,
      venxcar,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="h-id">Código</Label>
          <Input id="h-id" value={idhip} maxLength={6} onChange={(e) => setIdhip(e.target.value)} disabled={!!initial} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-nom">Nombre</Label>
          <Input id="h-nom" value={nomhip} maxLength={50} onChange={(e) => setNomhip(e.target.value)} required />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Nacional</SelectItem>
              <SelectItem value="1">Internacional</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-carr">Nº Carreras</Label>
          <Input id="h-carr" type="number" min="0" value={nrocarreras} onChange={(e) => setNrocarreras(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-cab">Nº Caballos</Label>
          <Input id="h-cab" type="number" min="0" value={nrocaballos} onChange={(e) => setNrocaballos(e.target.value)} />
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Distribución de la jugada (debe sumar 100%)
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="h-ret">% Retención Casa</Label>
            <Input id="h-ret" type="number" step="0.01" min="0" max="100" value={porcRetener} onChange={(e) => setPorcRetener(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-pa">% Aporte al Acumulado</Label>
            <Input id="h-pa" type="number" step="0.01" min="0" max="100" value={porcAcum} onChange={(e) => setPorcAcum(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-acum">Pote Acumulado (Bs)</Label>
            <Input id="h-acum" type="number" step="0.01" min="0" value={acumulado} onChange={(e) => setAcumulado(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-p1">% 1er lugar</Label>
            <Input id="h-p1" type="number" step="0.01" min="0" max="100" value={porc1} onChange={(e) => setPorc1(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-p2">% 2do lugar</Label>
            <Input id="h-p2" type="number" step="0.01" min="0" max="100" value={porc2} onChange={(e) => setPorc2(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h-p3">% 3er lugar</Label>
            <Input id="h-p3" type="number" step="0.01" min="0" max="100" value={porc3} onChange={(e) => setPorc3(e.target.value)} />
          </div>
        </div>
        {(() => {
          const suma = Number(porcRetener || 0) + Number(porcAcum || 0) + Number(porc1 || 0) + Number(porc2 || 0) + Number(porc3 || 0);
          const ok = Math.abs(suma - 100) < 0.01;
          return (
            <div className={`mt-2 text-xs ${ok ? "text-primary" : "text-destructive"}`}>
              Suma actual: {suma.toFixed(2)}% {ok ? "✓" : "— debe ser 100%"}
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-2">
          <Label htmlFor="h-cos">Costo boleto</Label>
          <Input id="h-cos" type="number" step="0.01" min="0" value={cosBol} onChange={(e) => setCosBol(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-dm">Div. máximo</Label>
          <Input id="h-dm" type="number" step="0.01" min="0" value={divmax} onChange={(e) => setDivmax(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-emp">Empate</Label>
          <Input id="h-emp" type="number" step="0.01" min="0" value={empate} onChange={(e) => setEmpate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="h-vxc">Venta x carrera</Label>
          <Input id="h-vxc" type="number" step="0.01" min="0" value={venxcar} onChange={(e) => setVenxcar(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="h-activo" checked={activo} onCheckedChange={setActivo} />
        <Label htmlFor="h-activo">Activo</Label>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
