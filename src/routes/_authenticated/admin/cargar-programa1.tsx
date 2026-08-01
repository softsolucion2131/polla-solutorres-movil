import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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

export const Route = createFileRoute("/_authenticated/admin/cargar-programa1")({
  component: CargarProgramaPage,
});

type Hipodromo = { idhip: string; nomhip: string; activo_ok: number };
type Ejemplar = { nroejem: string; nombreeje: string; retirado: boolean };

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
  const [validaNro, setValidaNro] = useState<string>("1");
  const [texto, setTexto] = useState<string>("");

  // Si se apaga el switch de la polla, reseteamos el número de válida
  useEffect(() => {
    if (!validaPolla) {
      setValidaNro("0");
    } else {
      setValidaNro("1");
    }
  }, [validaPolla]);

  const { data: hipodromos = [] } = useQuery({
    queryKey: ["hipodromos-activos"],
    queryFn: async () => {
      // Traemos todos los campos para evitar errores si cambió el nombre de 'nomhip' o 'activo_ok'
      const { data, error } = await supabase
        .from("hipodromos")
        .select("*");
      
      if (error) throw error;

      // Filtramos dinámicamente: acepta tanto si es activo_ok === 1 como si es activo === true
      const filtrados = (data || []).filter((h: any) => h.activo_ok === 1 || h.activo === true || h.activo_ok === "1");

      // Ordenamos alfabéticamente en JS usando el campo de nombre que exista (nomhip o nombre)
      return filtrados.sort((a: any, b: any) => {
        const nameA = a.nomhip || a.nombre || "";
        const nameB = b.nomhip || b.nombre || "";
        return nameA.localeCompare(nameB);
      });
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

      const nroValidaFinal = validaPolla ? parseInt(validaNro, 10) : 0;

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
            valida_nro: nroValidaFinal,
          })
          .eq("idprog", existing.idprog);
        if (error) throw error;
        idprog = existing.idprog;
        // Borrar detalle anterior para sobreescribir limpiamente
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
            valida_nro: nroValidaFinal,
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
        valida_nro: nroValidaFinal,
      }));
      
      const { error: detErr } = await supabase.from("detprog").insert(rows);
      if (detErr) throw detErr;

      return { nroCarrera, nroValidaFinal };
    },
    onSuccess: ({ nroCarrera, nroValidaFinal }) => {
      let mensaje = `Carrera ${nroCarrera} guardada (${parsed.length} ejemplares)`;
      if (validaPolla) {
        mensaje += ` asignada como la ${nroValidaFinal}ª Válida.`;
      }
      toast.success(mensaje);
      
      qc.invalidateQueries({ queryKey: ["programa"] });
      setCarrera(String(nroCarrera + 1));
      
      // Si era válida, incrementamos sugeridamente la siguiente posición de la polla
      if (validaPolla) {
        setValidaNro(String(nroValidaFinal + 1));
      }
      setTexto("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const limpiar = () => { setTexto(""); };

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAdmin) return <div className="text-destructive">No tienes permiso para ver esta sección.</div>;

  return (
    <div className="container mx-auto max-w-7xl p-4 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" /> Cargar Programa
        </h1>
        <p className="text-sm text-muted-foreground">Parser inteligente: vincula carreras y define secuencias de la polla hípica en base de datos.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="shadow-md border-0 rounded-xl">
          <CardHeader><CardTitle className="text-base font-bold">Configuración</CardTitle></CardHeader>
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
              <Label htmlFor="carrera">Nº carrera real</Label>
              <Input id="carrera" type="number" min="1" value={carrera} onChange={(e) => setCarrera(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horac">Hora de cierre</Label>
              <Input id="horac" type="time" value={horac} onChange={(e) => setHorac(e.target.value)} />
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Configuración de Polla</div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="valida-polla" className="cursor-pointer font-semibold">⭐ Válida para la polla</Label>
                <Switch id="valida-polla" checked={validaPolla} onCheckedChange={setValidaPolla} />
              </div>

              {validaPolla && (
                <div className="space-y-2 pt-2 border-t border-border animate-in fade-in-50 duration-200">
                  <Label htmlFor="valida-nro" className="text-xs font-bold text-amber-500">Número de Válida correspondiente</Label>
                  <Select value={validaNro} onValueChange={setValidaNro}>
                    <SelectTrigger id="valida-nro" className="border-amber-500/40">
                      <SelectValue placeholder="Seleccionar válida..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1ª Válida</SelectItem>
                      <SelectItem value="2">2ª Válida</SelectItem>
                      <SelectItem value="3">3ª Válida</SelectItem>
                      <SelectItem value="4">4ª Válida</SelectItem>
                      <SelectItem value="5">5ª Válida</SelectItem>
                      <SelectItem value="6">6ª Válida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-md border-0 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold">Texto del programa (cuerpo)</CardTitle>
              <span className="rounded-md bg-primary/20 px-2 py-1 text-xs font-semibold text-primary">Modo Inteligente</span>
            </CardHeader>
            <CardContent>
              <Textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={12}
                placeholder={`1\nNo Mor Stones\nJockey: Joezer Rangel\n2\nIt's Authentic\n...`}
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
            <Card className="shadow-md border-0 rounded-xl">
              <CardHeader><CardTitle className="text-base font-bold">Vista previa de la lista</CardTitle></CardHeader>
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
            className="w-full h-14 text-base font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || parsed.length === 0}
          >
            <Save className="mr-2 h-5 w-5" />
            {saveMutation.isPending ? "Guardando carrera y mapeando parámetros..." : "⚡ Guardar e incrementar carrera"}
          </Button>
        </div>
      </div>
    </div>
  );
}