import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sliders, ClipboardList, Trophy, AlertTriangle, Info, ShieldCheck, Terminal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/resultados1")({
  component: AdminResultadosPage,
});

// Genera la fecha 'YYYY-MM-DD' estricta para la zona horaria de Caracas, Venezuela
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

function AdminResultadosPage() {
  const qc = useQueryClient();
  
  // Estados de control
  const [fecha, setFecha] = useState(() => todayISO());
  const [selectedHip, setSelectedHip] = useState<string>("");
  const [selectedCarrera, setSelectedCarrera] = useState<string>("");
  const [tasaCambio, setTasaCambio] = useState<string>(() => localStorage.getItem("ultimaTasaPro") || "1.00");
  
  // Estados de la Pizarra
  const [pGanador, setPGanador] = useState("");
  const [pSegundo, setPSegundo] = useState("");
  const [pTercero, setPTercero] = useState("");
  const [divWin1, setDivWin1] = useState("");
  const [divPlace1, setDivPlace1] = useState("");
  const [divPlace2, setDivPlace2] = useState("");
  const [textoRaw, setTextoRaw] = useState("");
  
  // Terminal Logs simulados
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Guardar tasa localmente
  const handleTasaChange = (val: string) => {
    setTasaCambio(val);
    localStorage.setItem("ultimaTasaPro", val);
  };

  // 1. Query: Hipódromos activos en la fecha seleccionada con Fallback dinámico
  const { data: hipodromos = [] } = useQuery({
    queryKey: ["admin-hipodromos", fecha],
    queryFn: async () => {
      const { data: progs } = await supabase
        .from("programa")
        .select("idhip")
        .eq("fechac", fecha);
      
      const ids = Array.from(new Set((progs ?? []).map((p) => p.idhip)));
      if (ids.length === 0) return [];

      // SE AGREGA FILTRO estricto activo_ok = 1
      const { data } = await supabase
        .from("hipodromos")
        .select("idhip, nomhip")
        .in("idhip", ids)
        .eq("activo_ok", 1);

      // Mapeo flexible para evitar bloqueos si no está marcado activo temporalmente pero hay programa
      const mapeados = ids.map((id) => {
        const encontrado = data?.find((h) => h.idhip === id);
        return {
          idhip: id,
          nomhip: encontrado?.nomhip || `Hipódromo (${id})`
        };
      });

      return mapeados;
    },
  });

  // Limpiar selecciones dependientes si cambia la data madre
  useEffect(() => {
    setSelectedHip("");
    setSelectedCarrera("");
  }, [fecha]);

  // 2. Query: Carreras asociadas al hipódromo y fecha
  const { data: carreras = [] } = useQuery({
    enabled: !!selectedHip,
    queryKey: ["admin-carreras", selectedHip, fecha],
    queryFn: async () => {
      const { data } = await supabase
        .from("programa")
        .select("carrera")
        .eq("idhip", selectedHip)
        .eq("fechac", fecha)
        .order("carrera", { ascending: true });
      
      return Array.from(new Set((data ?? []).map((c) => String(c.carrera))));
    },
  });

  useEffect(() => {
    setSelectedCarrera("");
  }, [selectedHip]);

  // Lógica de calculadora local de escalas y dividendos unitarios
  const consultarCalculadoraLocal = async (idhip: string, tipo: "win" | "place", montoInh: number) => {
    if (montoInh <= 0) return 0.00;
    try {
      const { data: hReal } = await supabase.from("hipodromos").select("*").eq("idhip", idhip).maybeSingle();
      if (!hReal) return montoInh;

      const tipoHipodromo = hReal.tipo || 0; 
      const costoBoletoBase = Number(hReal.cos_bol || 100.0);
      const divMaxRegistro = Number(hReal.divmax || 1500.0);

      let topeAbsoluto = divMaxRegistro;
      let dividendoFinalUnitario = montoInh;

      if (tipoHipodromo === 1) {
        dividendoFinalUnitario = (costoBoletoBase / 2) * 1.0;
      } else {
        dividendoFinalUnitario = montoInh;
      }

      if (dividendoFinalUnitario > topeAbsoluto) dividendoFinalUnitario = topeAbsoluto;
      return Number(dividendoFinalUnitario.toFixed(2));
    } catch (e) {
      return montoInh;
    }
  };

  // Mutation: Procesar Puntos y Dividendos
  // Mutation: Procesar Puntos y Dividendos con Logs Exhaustivos en Consola y Pantalla
  const mutationProcesar = useMutation({
    mutationFn: async () => {
      if (!selectedHip || !selectedCarrera || !pGanador) {
        throw new Error("Debe seleccionar Hipódromo, Carrera e ingresar al menos el ejemplar Ganador.");
      }

      setShowLogs(true);
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] 🧮 Calculando escalas dinámicas...`]);

      const finalWin1 = await consultarCalculadoraLocal(selectedHip, "win", parseFloat(divWin1) || 0);
      const finalPlace1 = await consultarCalculadoraLocal(selectedHip, "place", parseFloat(divPlace1) || 0);
      const finalPlace2 = await consultarCalculadoraLocal(selectedHip, "place", parseFloat(divPlace2) || 0);

      setLogs((prev) => [
        ...prev,
        `> Dividendo Auditado Win (1°): Bs. ${finalWin1}`,
        `> Dividendo Auditado Place (1°): Bs. ${finalPlace1}`,
        `> Dividendo Auditado Place (2°): Bs. ${finalPlace2}`,
      ]);

      const pad = (n: string) => n.trim().padStart(2, "0");
      const numCarrera = parseInt(selectedCarrera);
      const g1 = pad(pGanador);
      const s2 = pSegundo ? pad(pSegundo) : null;
      const t3 = pTercero ? pad(pTercero) : null;

      const payload = {
        fechac: fecha,
        idhip: selectedHip,
        carrera: numCarrera,
        texto_exoticas: textoRaw || null,
        tasa_dia: parseFloat(tasaCambio),
        ganador: g1,
        segundo: s2,
        tercero: t3,
        div_ganador_win: finalWin1,
        div_ganador_place: finalPlace1,
        div_segundo_place: finalPlace2
      };

      // LOG EN CONSOLA DEL NAVEGADOR PARA REVISAR PAYLOAD
      console.log("=== ENVIANDO RESULTADOS A TABLA MAESTRA ===", payload);
      setLogs((prev) => [...prev, `> Guardando resultados en tabla resultados_carreras...`]);

      const { error: errorUpsert } = await supabase
        .from("resultados_carreras")
        .upsert(payload, { onConflict: "fechac,idhip,carrera" });

      if (errorUpsert) {
        console.error("ERROR EN UPSERT DE RESULTADOS:", errorUpsert);
        throw new Error(`Error guardando dividendos: ${errorUpsert.message}`);
      }

      const paramsRpc = {
        target_fecha: fecha,
        target_hip: selectedHip,
        target_carrera: numCarrera,
        ejem_1er: g1,
        ejem_2do: s2,
        ejem_3er: t3
      };

      // VERIFICACIÓN CLAVE: Ver qué parámetros le llegan al RPC
      console.log("=== ENVIANDO PARÁMETROS AL RPC ===", paramsRpc);
      setLogs((prev) => [...prev, `> Ejecutando RPC 'actualizar_puntos_polla_carrera' para Carrera ${numCarrera}...`]);

      const { data: rpcResult, error: errorRpc } = await supabase.rpc("actualizar_puntos_polla_carrera", paramsRpc);

      if (errorRpc) {
        console.error("ERROR DETECTADO EN EL RPC DE POSTGRESQL:", errorRpc);
        setLogs((prev) => [
          ...prev, 
          `❌ ERROR POSTGRES [Código ${errorRpc.code}]: ${errorRpc.message}`,
          `> Detalles: ${errorRpc.details || 'Ninguno'}`,
          `> Hint: ${errorRpc.hint || 'Ninguno'}`
        ]);
        throw errorRpc;
      }

      // Si Postgres devolvió alguna respuesta o se ejecutó limpio
      console.log("=== RESPUESTA EXITOSA DEL RPC ===", rpcResult);

      setLogs((prev) => [
        ...prev,
        `> Historial de dividendos asentado correctamente.`,
        `> RPC ejecutado sin errores del motor de base de datos.`,
        `> PROCESO DE CIERRE DE CARRERA COMPLETADO.`
      ]);

      return payload;
    },
    onSuccess: () => {
      toast.success("¡Carrera procesada con éxito!");
      qc.invalidateQueries({ queryKey: ["admin-carreras", selectedHip, fecha] });
      qc.invalidateQueries({ queryKey: ["pollas-stats"] });
    },
    onError: (err: any) => {
      // Forzar que el error ruidoso se pinte en la caja negra de la interfaz
      console.error("MUTATION ERROR INTERCEPTED:", err);
      setLogs((prev) => [...prev, `❌ CRITICAL ERROR: ${err.message || JSON.stringify(err)}`]);
      toast.error(err.message || "Error al procesar los resultados");
    }
  });

  // Mutation: Abonar Premios Globales
  const mutationAbonar = useMutation({
    mutationFn: async () => {
      if (!selectedHip) throw new Error("Seleccione el Hipódromo y la Fecha.");

      const { error } = await supabase.rpc("liquidar_premios_polla", {
        target_hip: selectedHip,
        target_fecha: fecha
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("¡Premios de Polla abonados exitosamente a las cuentas de los usuarios!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Error al abonar los premios");
    }
  });

  return (
    <div className="container mx-auto max-w-7xl p-4 space-y-6">
      <div className="grid gap-6 md:grid-cols-12">
        
        {/* Columna Izquierda: Configuración de Carrera */}
        <div className="md:col-span-5">
          <Card className="shadow-md border-0 rounded-xl">
            <CardHeader className="bg-card pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-muted-foreground">
                <Sliders className="h-5 w-5 text-emerald-500" />
                Configuración de Carrera
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-50/10 space-y-1.5">
                <Label className="font-bold text-emerald-500 text-xs uppercase tracking-wider flex items-center gap-1">
                  Tasa del Día (BS)
                </Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={tasaCambio} 
                  onChange={(e) => handleTasaChange(e.target.value)}
                  className="text-lg font-mono font-bold text-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Fecha</Label>
                <Input 
                  type="date" 
                  value={fecha} 
                  onChange={(e) => setFecha(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Hipódromo</Label>
                <select 
                  value={selectedHip} 
                  onChange={(e) => setSelectedHip(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Seleccione Hipódromo</option>
                  {hipodromos.map((h) => (
                    <option key={h.idhip} value={h.idhip}>{h.nomhip}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-amber-500">Número de Carrera (Posición en Combinación)</Label>
                <select 
                  value={selectedCarrera} 
                  disabled={!selectedHip}
                  onChange={(e) => setSelectedCarrera(e.target.value)}
                  className="w-full rounded-md border border-amber-500/40 bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">-- Seleccione Carrera --</option>
                  {carreras.map((c) => (
                    <option key={c} value={c}>Carrera {c}</option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-600 flex items-start gap-1 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  La puntuación de la polla se aplicará a la posición correspondiente en la matriz indexada del ticket de pollas.
                </p>
              </div>

              <div className="rounded-xl bg-blue-50/10 border border-blue-500/20 p-3 mt-4">
                <div className="flex gap-2.5">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-400 space-y-1">
                    <strong className="block font-semibold">Regla de Puntos de la Polla:</strong>
                    <span>1er Lugar: 5 pts | 2do Lugar: 3 pts | 3er Lugar: 1 pt.</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Entrada de Resultados y Dividendos */}
        <div className="md:col-span-7">
          <Card className="shadow-md border-0 rounded-xl">
            <CardHeader className="bg-card pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Entrada de Resultados y Dividendos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              <div className="p-4 rounded-xl bg-blue-50/5 border border-dashed border-blue-500/40 space-y-4">
                <h6 className="text-blue-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="h-4 w-4" /> Pizarra Oficial (Resultados Taquilla / Polla)
                </h6>

                {/* 1er Lugar */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-3">
                    <span className="w-full inline-block bg-amber-500 text-dark text-xs font-bold text-center py-2 rounded uppercase shadow-sm">1° Lugar (#)</span>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input type="text" maxLength={2} placeholder="00" value={pGanador} onChange={(e) => setPGanador(e.target.value)} className="text-center font-bold border-amber-500" />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[10px] text-emerald-500 font-bold">Win Bs</span>
                      <Input type="number" step="0.01" placeholder="0.00" value={divWin1} onChange={(e) => setDivWin1(e.target.value)} className="pl-14 text-right font-mono font-bold text-emerald-500 text-sm h-9" />
                    </div>
                  </div>
                  <div className="col-span-4 sm:col-span-4">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[10px] text-muted-foreground">Place Bs</span>
                      <Input type="number" step="0.01" placeholder="0.00" value={divPlace1} onChange={(e) => setDivPlace1(e.target.value)} className="pl-14 text-right font-mono text-sm h-9" />
                    </div>
                  </div>
                </div>

                {/* 2do Lugar */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-3">
                    <span className="w-full inline-block bg-slate-400 text-white text-xs font-bold text-center py-2 rounded uppercase shadow-sm">2do Lugar (#)</span>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input type="text" maxLength={2} placeholder="00" value={pSegundo} onChange={(e) => setPSegundo(e.target.value)} className="text-center font-bold" />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Input value="-" disabled className="text-center bg-muted text-muted-foreground h-9" />
                  </div>
                  <div className="col-span-4 sm:col-span-4">
                    <div className="relative flex items-center">
                      <span className="absolute left-2 text-[10px] text-cyan-500 font-bold">Place Bs</span>
                      <Input type="number" step="0.01" placeholder="0.00" value={divPlace2} onChange={(e) => setDivPlace2(e.target.value)} className="pl-14 text-right font-mono font-bold text-cyan-500 text-sm h-9" />
                    </div>
                  </div>
                </div>

                {/* 3er Lugar */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 sm:col-span-3">
                    <span className="w-full inline-block bg-slate-700 text-white text-xs font-bold text-center py-2 rounded uppercase shadow-sm">3er Lugar (#)</span>
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Input type="text" maxLength={2} placeholder="00" value={pTercero} onChange={(e) => setPTercero(e.target.value)} className="text-center font-bold" />
                  </div>
                  <div className="col-span-9 sm:col-span-7">
                    <p className="text-[11px] text-muted-foreground text-right">
                      Otorga 1 punto en la secuencia de la polla hípica.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Texto Oficial Exóticas (Opcional)</Label>
                <Textarea 
                  rows={3} 
                  placeholder="Pegue aquí bloques adicionales de dividendos si es necesario..." 
                  value={textoRaw}
                  onChange={(e) => setTextoRaw(e.target.value)}
                  className="font-monospace text-xs bg-muted/40 resize-none"
                />
              </div>

              <Button 
                onClick={() => mutationProcesar.mutate()} 
                disabled={mutationProcesar.isPending || !selectedCarrera}
                className="w-full font-bold py-5 text-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                {mutationProcesar.isPending ? "PROCESANDO ESCALAS..." : "PROCESAR PUNTOS Y DIVIDENDOS"}
              </Button>

              <div className="p-1.5 border border-emerald-500/20 rounded-xl bg-emerald-500/5 mt-2">
                <Button 
                  onClick={() => {
                    if (confirm(`¿Abonar premios acumulados de Polla para ${selectedHip} de la fecha ${fecha}?`)) {
                      mutationAbonar.mutate();
                    }
                  }} 
                  disabled={mutationAbonar.isPending || !selectedHip}
                  variant="outline"
                  className="w-full font-bold py-5 text-md border-emerald-600 text-emerald-500 hover:bg-emerald-600 hover:text-white"
                >
                  <ShieldCheck className="h-5 w-5 mr-2" />
                  ABONAR PREMIOS DE POLLA A USUARIOS
                </Button>
              </div>

              {/* Servidor Console Log Output */}
              {showLogs && (
                <div className="space-y-1.5 mt-4">
                  <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Log de Operaciones en Servidor:
                  </Label>
                  <div className="font-mono text-xs bg-zinc-950 text-emerald-400 p-4 border border-zinc-800 rounded-lg max-h-[160px] overflow-y-auto space-y-1 shadow-inner">
                    {logs.map((log, index) => (
                      <div key={index}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
