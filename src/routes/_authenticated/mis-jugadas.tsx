import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeftCircle, 
  Trophy, 
  Ticket, 
  CheckCircle2, 
  Hourglass, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Printer, 
  Filter, 
  X,
  FileText
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/mis-jugadas")({
  component: MisJugadasPage,
});

const PAGE_SIZE = 10;

const fmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Jugada = {
  id: string;
  created_at: string;
  origen?: string;
  ticket_serial?: string;
  ticket_id?: string;
  hipodromo?: string;
  carrera?: string;
  tipo_apuesta?: string;
  combinacion?: any;
  combinaciones?: any;
  monto_jugado?: number;
  monto?: number;
  estado?: string;
  premio_bs?: number;
};

/**
 * OPCIÓN B: Formateador para combinaciones
 * Transforma la estructura JSON/array en un formato de visualización tipo:
 * C3: 3 | C4: 4 | C5: 7 | C6: 2 | C7: 6 | C8: 6
 */
function formatearCombinacionOpcionB(comb: any): string {
  if (!comb) return "-";

  let parsed = comb;

  // Si viene como string JSON, lo parseamos
  if (typeof comb === "string") {
    try {
      parsed = JSON.parse(comb);
    } catch {
      // Si ya era un string legible común, lo devolvemos directo
      return comb;
    }
  }

  // Si es un arreglo con el detalle por carrera
  if (Array.isArray(parsed)) {
    return parsed
      .map((item: any) => {
        const nros = Array.isArray(item.nros)
          ? item.nros.join(",")
          : item.nros || item.ejemplar || item.num;
        const carrera = item.carrera || item.c;
        return carrera ? `C${carrera}: [${nros}]` : `[${nros}]`;
      })
      .filter(Boolean)
      .join("  |  ");
  }

  return String(comb);
}

function MisJugadasPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Consulta a Supabase
  const { data: result, isLoading, isError, error } = useQuery({
    enabled: !!user?.id,
    queryKey: ["mis-jugadas", user?.id, page, fechaDesde, fechaHasta],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("jugadas")
        .select("*", { count: "exact" })
        .eq("user_id", user!.id);

      if (fechaDesde) {
        const desdeISO = new Date(`${fechaDesde}T00:00:00`).toISOString();
        query = query.gte("created_at", desdeISO);
      }

      if (fechaHasta) {
        const hastaISO = new Date(`${fechaHasta}T23:59:59.999`).toISOString();
        query = query.lte("created_at", hastaISO);
      }

      const { data, count, error: supabaseError } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (supabaseError) throw supabaseError;

      const totalRecords = count ?? 0;
      const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;

      return {
        jugadas: (data ?? []) as Jugada[],
        totalRecords,
        totalPages,
      };
    },
  });

  const jugadas = result?.jugadas ?? [];
  const totalPages = result?.totalPages ?? 1;

  const handleFechaDesdeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFechaDesde(e.target.value);
    setPage(1);
  };

  const handleFechaHastaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFechaHasta(e.target.value);
    setPage(1);
  };

  const handleLimpiarFiltros = () => {
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
  };

  const isGanador = (estado?: string) => {
    if (!estado) return false;
    const est = estado.toLowerCase();
    return est === "ganador" || est === "pagado" || est === "abonado";
  };

  const isPendiente = (estado?: string) => {
    if (!estado) return true;
    const est = estado.toLowerCase();
    return est === "pendiente" || est === "proceso";
  };

  return (
    <>
      <style>{`
        @media print {
          body { background-color: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .card-print { background: #fff !important; color: #000 !important; border: 1px solid #ccc !important; box-shadow: none !important; }
          .table-print th, .table-print td { color: #000 !important; border-bottom: 1px solid #ddd !important; }
          .badge-print { border: 1px solid #000 !important; color: #000 !important; background: transparent !important; }
        }
      `}</style>

      <div className="container mx-auto max-w-6xl px-4 py-6 text-slate-100 print-full-width">
        {/* Botón Volver e Imprimir */}
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#39ff14]"
          >
            <ArrowLeftCircle className="h-5 w-5" /> Volver al Dashboard
          </Link>

          <Button
            onClick={() => window.print()}
            variant="outline"
            className="border-slate-700 bg-[#24282d] text-slate-200 hover:bg-slate-800 hover:text-[#39ff14]"
          >
            <Printer className="mr-2 h-4 w-4" /> Exportar / Imprimir
          </Button>
        </div>

        {/* Filtros de Fecha */}
        <Card className="no-print mb-4 border-slate-800 bg-[#24282d] p-4 shadow-lg">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Filter className="h-4 w-4 text-cyan-400" /> Filtrar por fechas:
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-slate-400">Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={handleFechaDesdeChange}
                  className="h-9 border-slate-700 bg-[#1a1d21] text-slate-200"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] uppercase tracking-wider text-slate-400">Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={handleFechaHastaChange}
                  className="h-9 border-slate-700 bg-[#1a1d21] text-slate-200"
                />
              </div>

              {(fechaDesde || fechaHasta) && (
                <Button
                  onClick={handleLimpiarFiltros}
                  variant="ghost"
                  size="sm"
                  className="mt-5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Limpiar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Tarjeta del Historial */}
        <Card className="card-print overflow-hidden border-slate-800 bg-[#24282d] shadow-2xl">
          <div className="border-b border-slate-800 bg-black/10 p-6 text-center">
            <h3 className="flex items-center justify-center gap-2 text-2xl font-bold text-cyan-400 print:text-black">
              <FileText className="h-6 w-6 no-print" /> Historial de Jugadas
            </h3>
            <p className="mt-1 text-xs text-slate-400 print:text-black">
              Consulta el estado detallado de tus apuestas en taquilla y pollas
            </p>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="table-print w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-4 pr-2">Fecha / Hora</th>
                    <th className="py-3.5 px-2 text-center">Origen</th>
                    <th className="py-3.5 px-2">Ticket / ID</th>
                    <th className="py-3.5 px-2 text-center">Hip.</th>
                    <th className="py-3.5 px-2 text-center">Carrera</th>
                    <th className="py-3.5 px-2">Tipo</th>
                    <th className="py-3.5 px-2">Combinación</th>
                    <th className="py-3.5 px-2 text-right">Monto</th>
                    <th className="py-3.5 px-2 text-center">Estado</th>
                    <th className="py-3.5 pl-2 pr-4 text-right">Premio (Bs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500">
                        Cargando jugadas...
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-rose-400">
                        Error al cargar jugadas: {(error as Error)?.message}
                      </td>
                    </tr>
                  ) : jugadas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Info className="h-5 w-5 text-slate-500" />
                          No se encontraron jugadas en tu historial.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jugadas.map((j) => {
                      const gana = isGanador(j.estado);
                      const pend = isPendiente(j.estado);
                      const serial = j.ticket_serial || j.ticket_id || j.id.slice(0, 8);
                      const rawComb = j.combinacion || j.combinaciones;
                      const combFormatted = formatearCombinacionOpcionB(rawComb);
                      const monto = j.monto_jugado ?? j.monto ?? 0;
                      const premio = j.premio_bs ?? 0;

                      return (
                        <tr
                          key={j.id}
                          className={`transition-colors hover:bg-slate-800/40 ${
                            gana
                              ? "border-l-4 border-l-[#39ff14] bg-[#39ff14]/5"
                              : pend
                              ? "border-l-4 border-l-amber-500"
                              : ""
                          }`}
                        >
                          {/* Fecha */}
                          <td className="whitespace-nowrap py-3 pl-4 pr-2 font-mono text-xs text-slate-400 print:text-black">
                            {new Date(j.created_at).toLocaleString("es-VE", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>

                          {/* Origen */}
                          <td className="py-3 px-2 text-center">
                            {j.origen === "Polla" ? (
                              <span className="inline-flex items-center justify-center gap-1 rounded bg-purple-900/50 px-2 py-0.5 text-[11px] font-bold text-purple-300 border border-purple-700/50">
                                <Trophy className="h-3 w-3" /> Polla
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 rounded bg-cyan-950 px-2 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-800/50">
                                <Ticket className="h-3 w-3" /> Taquilla
                              </span>
                            )}
                          </td>

                          {/* Ticket / ID */}
                          <td className="py-3 px-2 font-mono text-xs font-bold uppercase text-slate-300 print:text-black">
                            {serial}
                          </td>

                          {/* Hipódromo */}
                          <td className="py-3 px-2 text-center">
                            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-200">
                              {j.hipodromo || "LR"}
                            </span>
                          </td>

                          {/* Carrera */}
                          <td className="py-3 px-2 text-center text-xs">
                            {!j.carrera || j.carrera === "Global" ? (
                              <span className="italic text-slate-400">Global</span>
                            ) : (
                              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-slate-300">
                                C-{j.carrera}
                              </span>
                            )}
                          </td>

                          {/* Tipo */}
                          <td className="py-3 px-2 text-xs font-semibold uppercase text-slate-300">
                            {j.tipo_apuesta || "Polla 5 y 6"}
                          </td>

                          {/* Combinación Formateada con Opción B */}
                          <td 
                            className="max-w-[260px] truncate py-3 px-2 font-mono text-xs font-medium text-emerald-400 print:text-black" 
                            title={combFormatted}
                          >
                            {combFormatted}
                          </td>

                          {/* Monto */}
                          <td className="py-3 px-2 text-right font-mono font-bold text-cyan-400 print:text-black">
                            Bs {fmt.format(monto)}
                          </td>

                          {/* Estado */}
                          <td className="py-3 px-2 text-center">
                            {gana ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase text-[#39ff14] border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3" /> Ganador
                              </span>
                            ) : pend ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase text-amber-400 border border-amber-500/30">
                                <Hourglass className="h-3 w-3" /> {j.estado || "Proceso"}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] uppercase text-slate-400">
                                {j.estado || "Perdedor"}
                              </span>
                            )}
                          </td>

                          {/* Premio */}
                          <td className={`py-3 pl-2 pr-4 text-right font-mono font-bold ${premio > 0 ? "text-base text-[#39ff14]" : "text-slate-500"}`}>
                            {premio > 0 ? `+Bs ${fmt.format(premio)}` : "Bs 0,00"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>

          {/* Paginación */}
          <div className="no-print flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 bg-[#1a1d21] p-4">
            <div className="text-xs text-slate-400">
              Página <strong className="text-slate-200">{page}</strong> de{" "}
              <strong className="text-slate-200">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="border-slate-800 bg-[#24282d] text-slate-300 hover:bg-slate-800 hover:text-[#39ff14]"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="border-slate-800 bg-[#24282d] text-slate-300 hover:bg-slate-800 hover:text-[#39ff14]"
              >
                Siguiente <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}