import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, UserMinus, Trophy, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/retirados")({
  component: AdminRetiradosPage,
});

type Hipodromo = { idhip: string; nomhip: string };

type Carrera = {
  idprog: number;
  carrera: number;
  valida_polla: boolean;
  valida_nro: number;
};

type Ejemplar = {
  idprog: number;
  nroejem: string;
  nombreeje: string | null;
  ret_ok: boolean;
};

// Genera fecha estricta para la zona horaria de Caracas
function todayISO() {
  const caracasString = new Date().toLocaleString("en-US", {
    timeZone: "America/Caracas",
  });
  const d = new Date(caracasString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function AdminRetiradosPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [fechac] = useState(() => todayISO());
  const [selectedHip, setSelectedHip] = useState<string | null>(null);
  const [selectedCarrera, setSelectedCarrera] = useState<Carrera | null>(null);
  const [selectedEjemplar, setSelectedEjemplar] = useState<Ejemplar | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 1. Obtener hipódromos con carreras hoy
  const { data: hipodromos = [] } = useQuery({
    queryKey: ["admin-retirados-hipodromos", fechac],
    queryFn: async () => {
      const { data: progs } = await supabase
        .from("programa")
        .select("idhip")
        .eq("fechac", fechac);

      const ids = Array.from(new Set((progs ?? []).map((p) => p.idhip)));
      if (ids.length === 0) return [] as Hipodromo[];

      const { data } = await supabase
        .from("hipodromos")
        .select("idhip, nomhip")
        .in("idhip", ids);

      return (data ?? []) as Hipodromo[];
    },
  });

  // 2. Obtener carreras del día para el hipódromo seleccionado
  const { data: carreras = [] } = useQuery({
    enabled: !!selectedHip,
    queryKey: ["admin-retirados-carreras", selectedHip, fechac],
    queryFn: async () => {
      const { data } = await supabase
        .from("programa")
        .select("idprog, carrera, valida_polla, valida_nro")
        .eq("idhip", selectedHip!)
        .eq("fechac", fechac)
        .order("carrera", { ascending: true });

      return (data ?? []) as Carrera[];
    },
  });

  // 3. Obtener ejemplares de la carrera seleccionada
  const { data: ejemplares = [], refetch: refetchEjemplares } = useQuery({
    enabled: !!selectedCarrera,
    queryKey: ["admin-retirados-ejemplares", selectedCarrera?.idprog],
    queryFn: async () => {
      const { data } = await supabase
        .from("detprog")
        .select("idprog, nroejem, nombreeje, ret_ok")
        .eq("idprog", selectedCarrera!.idprog);

      return (data ?? []).sort((a, b) => Number(a.nroejem) - Number(b.nroejem)) as Ejemplar[];
    },
  });

  // Algoritmo de reasignación cíclica/circular del retirado
  const calcularSustituto = (nroRetirado: string, listaEjemplares: Ejemplar[]): string => {
    const ordenados = [...listaEjemplares].sort((a, b) => Number(a.nroejem) - Number(b.nroejem));
    const total = ordenados.length;
    const idxRetirado = ordenados.findIndex((e) => e.nroejem === nroRetirado);

    if (idxRetirado === -1 || total === 0) return nroRetirado;

    // Recorrer cíclicamente el arreglo buscando el primer caballo NO retirado
    for (let i = 1; i < total; i++) {
      const nextIdx = (idxRetirado + i) % total;
      const candidato = ordenados[nextIdx];
      
      // Si el candidato no es el mismo retirado y está activo (ret_ok === false)
      if (candidato.nroejem !== nroRetirado && !candidato.ret_ok) {
        return candidato.nroejem;
      }
    }

    return nroRetirado; // Resguardo en caso extremo de que todos estén retirados
  };

  // Mutación para procesar el retiro y reasignar las pollas
  const retirarMutation = useMutation({
    mutationFn: async () => {
      if (!selectedHip || !selectedCarrera || !selectedEjemplar) return;

      const nroRetirado = selectedEjemplar.nroejem;

      // A. Marcar el ejemplar como retirado en detprog
      const { error: errDet } = await supabase
        .from("detprog")
        .update({ ret_ok: true })
        .eq("idprog", selectedCarrera.idprog)
        .eq("nroejem", nroRetirado);

      if (errDet) throw errDet;

      // Actualizar la lista local de ejemplares para calcular el sustituto correcto
      const ejemplaresActualizados = ejemplares.map((e) =>
        e.nroejem === nroRetirado ? { ...e, ret_ok: true } : e
      );

      const sustituto = calcularSustituto(nroRetirado, ejemplaresActualizados);

      // B. Si la carrera no es válida de polla o el sustituto es el mismo, finalizamos
      if (!selectedCarrera.valida_polla) {
        return { pollasActualizadas: 0, sustituto };
      }

      // C. Obtener las pollas registradas para este evento
      const { data: pollas, error: errPollas } = await supabase
        .from("pollas")
        .select("id, combinacion")
        .eq("idhip", selectedHip)
        .eq("fechac", fechac);

      if (errPollas) throw errPollas;

      let modificadasCount = 0;

      // D. Recorrer y reasignar las combinaciones afectadas
      for (const polla of pollas ?? []) {
        const combinacion = (polla.combinacion as { carrera: number; nros: string[] }[]) || [];
        let huboCambio = false;

        const nuevaCombinacion = combinacion.map((c) => {
          if (Number(c.carrera) === Number(selectedCarrera.carrera)) {
            // Verificar si la selección contenía al caballo retirado
            if (c.nros.includes(nroRetirado)) {
              huboCambio = true;
              // Reemplazar el retirado por el sustituto sin duplicar valores
              const nuevosNros = Array.from(
                new Set(c.nros.map((n) => (n === nroRetirado ? sustituto : n)))
              ).sort((a, b) => Number(a) - Number(b));

              return { ...c, nros: nuevosNros };
            }
          }
          return c;
        });

        if (huboCambio) {
          const { error: errUpd } = await supabase
            .from("pollas")
            .update({ combinacion: nuevaCombinacion })
            .eq("id", polla.id);

          if (!errUpd) modificadasCount++;
        }
      }

      return { pollasActualizadas: modificadasCount, sustituto };
    },
    onSuccess: (res) => {
      toast.success(
        `Ejemplar Nº ${selectedEjemplar?.nroejem} marcado como RETIRADO. ` +
        (res?.sustituto ? `Sustituto asignado: Nº ${res.sustituto}. ` : "") +
        `Pollas reasignadas: ${res?.pollasActualizadas ?? 0}`
      );
      setConfirmOpen(false);
      setSelectedEjemplar(null);
      refetchEjemplares();
      qc.invalidateQueries({ queryKey: ["pollas-mias"] });
    },
    onError: (e: any) => {
      toast.error(e.message || "Ocurrió un error al procesar el retiro");
    },
  });

  if (authLoading) return <div className="p-4 text-muted-foreground">Cargando...</div>;
  if (!isAdmin) return <div className="p-4 text-destructive">Acceso restringido.</div>;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <UserMinus className="h-6 w-6 text-destructive" /> Retirados de Última Hora
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecciona la carrera y el ejemplar a retirar. Se actualizará en sistema y se reasignará automáticamente la combinación en las pollas vendidas.
        </p>
      </div>

      {/* 1. Selección de Hipódromo */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">1. Seleccionar Hipódromo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hipodromos.length === 0 && (
              <span className="text-sm text-muted-foreground">No hay carreras programadas para hoy ({fechac}).</span>
            )}
            {hipodromos.map((h) => (
              <Button
                key={h.idhip}
                variant={selectedHip === h.idhip ? "default" : "outline"}
                onClick={() => {
                  setSelectedHip(h.idhip);
                  setSelectedCarrera(null);
                  setSelectedEjemplar(null);
                }}
              >
                <Trophy className="mr-2 h-4 w-4" /> {h.nomhip}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Selección de Carrera */}
      {selectedHip && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">2. Seleccionar Carrera</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {carreras.map((c) => (
                <Button
                  key={c.idprog}
                  variant={selectedCarrera?.idprog === c.idprog ? "default" : "outline"}
                  onClick={() => {
                    setSelectedCarrera(c);
                    setSelectedEjemplar(null);
                  }}
                >
                  Carrera {c.carrera} {c.valida_polla && `(${c.valida_nro}ª Válida)`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Selección de Ejemplar */}
      {selectedCarrera && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>3. Ejemplares - Carrera Nº {selectedCarrera.carrera}</span>
              <Button variant="ghost" size="sm" onClick={() => refetchEjemplares()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Actualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {ejemplares.map((e) => (
                <button
                  key={e.nroejem}
                  disabled={e.ret_ok}
                  onClick={() => {
                    setSelectedEjemplar(e);
                    setConfirmOpen(true);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 transition-all ${
                    e.ret_ok
                      ? "border-destructive/30 bg-destructive/10 text-destructive cursor-not-allowed opacity-60"
                      : "border-border bg-card hover:border-destructive hover:bg-destructive/5"
                  }`}
                >
                  <span className="font-mono text-xl font-bold">{e.nroejem}</span>
                  <span className="text-xs truncate w-full text-center mt-1 font-medium">
                    {e.nombreeje || "Sin Nombre"}
                  </span>
                  <span className="text-[10px] mt-1 font-semibold uppercase">
                    {e.ret_ok ? "RETIRADO" : "CORRE"}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Confirmación */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirmar Retiro de Ejemplar
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Estás seguro de retirar al caballo <strong>Nº {selectedEjemplar?.nroejem} - {selectedEjemplar?.nombreeje}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500 space-y-1">
            <p className="font-bold">⚠️ Consecuencia de esta acción:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Se marcará <code className="font-bold">ret_ok = true</code> en el programa.</li>
              <li>Todas las pollas jugadas con este caballo serán sustituidas automáticamente por el <strong>siguiente número disponible</strong> en forma cíclica.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={retirarMutation.isPending}
              onClick={() => retirarMutation.mutate()}
            >
              {retirarMutation.isPending ? "Procesando..." : "Sí, retirar y reasignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}