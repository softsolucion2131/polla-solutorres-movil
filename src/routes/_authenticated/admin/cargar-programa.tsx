import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Zap, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/cargar-programa")({
  component: CargarProgramaPage,
});

type Hipodromo = { idhip: string; nomhip: string; activo: boolean };
type Ejemplar = { nroejem: string; nombreeje: string; retirado: boolean };

// Parser "Modo Inteligente": recorre línea por línea.
// - Una línea que sea SOLO un número → inicia nuevo ejemplar (nroejem).
// - Siguiente línea no vacía y que no empiece con "Jockey:" → nombre del ejemplar.
// - Líneas "Jockey: ..." se ignoran.
function parsePrograma(text: string): Ejemplar[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const out: Ejemplar[] = [];
  let current: Ejemplar | null = null;
  let expectName = false;

  for (const line of lines) {
    if (!line) continue;
    const numMatch = /^(\d{1,2})[a-zA-Z]?$/.exec(line);
    if (numMatch) {
      if (current) out.push(current);
      current = { nroejem: numMatch[1], nombreeje: "", retirado: false };
      expectName = true;
      continue;
    }
    if (/^jockey\s*:/i.test(line)) continue;
    if (current && expectName) {
      current.nombreeje = line;
      if (/^retirad[oa]$/i.test(line.trim())) current.retirado = true;
      expectName = false;
    }
  }
  if (current) out.push(current);
  return out.filter((e) => e.nombreeje);
}

function CargarProgramaPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [idhip, setIdhip] = useState<string>("");
  const [fechac, setFechac] = useState<string>(today);
  const [carrera, setCarrera] = useState<string>("1");
  const [horac, setHorac] = useState<string>("12:00");
  const [validaPolla, setValidaPolla] = useState(false);
  const [texto, setTexto] = useState<string>("");

  const { data: hipodromos = [] } = useQuery({
    queryKey: ["hipodromos-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hipodromos")
        .select("idhip, nomhip, activo")
        .eq("activo", true)
        .order("nomhip");
      if (error) throw error;
      return data as Hipodromo[];
    },
  });

  const parsed = useMemo(() => parsePrograma(texto), [texto]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!idhip) throw new Error("Selecciona un hipódromo");
      if (!fechac) throw new Error("Selecciona una fecha");
      const nroCarrera = parseInt(carrera, 10);
      if (!nroCarrera || nroCarrera < 1) throw new Error("Número de carrera inválido");
      if (parsed.length === 0) throw new Error("No se detectaron ejemplares en el texto");

      // Upsert programa (encabezado)
      const { data: existing } = await supabase
        .from("programa")
        .select("idprog")
        .eq("idhip", idhip)
        .eq("fechac", fechac)
        .eq("carrera", nroCarrera)
        .maybeSingle();

      let idprog: number;
      if (existing) {
        const { error } = await supabase
          .from("programa")
          .update({
            horac,
            nrocab: parsed.length,
            valida_polla: validaPolla,
          })
          .eq("idprog", existing.idprog);
        if (error) throw error;
        idprog = existing.idprog;
        // borrar detalle anterior
        await supabase.from("detprog").delete().eq("idprog", idprog);
      } else {
        const { data, error } = await supabase
          .from("programa")
          .insert({
            idhip,
            fechac,
            carrera: nroCarrera,
            horac,
            nrocab: parsed.length,
            valida_polla: validaPolla,
          })
          .select("idprog")
          .single();
        if (error) throw error;
        idprog = data.idprog;
      }

      const rows = parsed.map((e) => ({
        idprog,
        idhip,
        fechac,
        carrera: nroCarrera,
        nroejem: e.nroejem,
        nombreeje: e.nombreeje,
        ret_ok: e.retirado,
        valida_polla: validaPolla,
      }));
      const { error: detErr } = await supabase.from("detprog").insert(rows);
      if (detErr) throw detErr;

      return nroCarrera;
    },
    onSuccess: (nroCarrera) => {
      toast.success(`Carrera ${nroCarrera} guardada (${parsed.length} ejemplares)`);
      qc.invalidateQueries({ queryKey: ["programa"] });
      setCarrera(String(nroCarrera + 1));
      setTexto("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const limpiar = () => { setTexto(""); };

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAdmin) return <div className="text-destructive">No tienes permiso para ver esta sección.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" /> Cargar Programa
        </h1>
        <p className="text-sm text-muted-foreground">Parser inteligente: pega el texto del programa y detecta automáticamente los ejemplares.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Configuración</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Hipódromo</Label>
              <Select value={idhip} onValueChange={setIdhip}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {hipodromos.map((h) => (
                    <SelectItem key={h.idhip} value={h.idhip}>{h.nomhip}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechac">Fecha de carrera</Label>
              <Input id="fechac" type="date" value={fechac} onChange={(e) => setFechac(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrera">Nº carrera</Label>
              <Input id="carrera" type="number" min="1" value={carrera} onChange={(e) => setCarrera(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horac">Hora de cierre</Label>
              <Input id="horac" type="time" value={horac} onChange={(e) => setHorac(e.target.value)} />
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Configuración especial</div>
              <div className="flex items-center gap-3">
                <Switch id="valida-polla" checked={validaPolla} onCheckedChange={setValidaPolla} />
                <Label htmlFor="valida-polla" className="cursor-pointer">⭐ Válida para la polla</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Texto del programa (cuerpo)</CardTitle>
              <span className="rounded-md bg-primary/20 px-2 py-1 text-xs font-semibold text-primary">Modo Inteligente</span>
            </CardHeader>
            <CardContent>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={12}
                placeholder={`1\nNo Mor Stones\nJockey: Joezer Rangel\n5\n2\nIt's Authentic\n...`}
                className="font-mono text-sm"
              />
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={limpiar} type="button">
                  <Trash2 className="mr-2 h-4 w-4" /> Limpiar
                </Button>
                <div className="ml-auto text-sm text-muted-foreground self-center">
                  Detectados: <span className="font-bold text-foreground">{parsed.length}</span> ejemplares
                </div>
              </div>
            </CardContent>
          </Card>

          {parsed.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Vista previa</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Nº</TableHead>
                      <TableHead>Ejemplar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono font-bold">{e.nroejem}</TableCell>
                        <TableCell>{e.nombreeje}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full h-14 text-base font-semibold"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || parsed.length === 0}
          >
            <Save className="mr-2 h-5 w-5" />
            {saveMutation.isPending ? "Guardando..." : "⚡ Guardar e incrementar carrera"}
          </Button>
        </div>
      </div>
    </div>
  );
}
