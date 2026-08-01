import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeftCircle, 
  Wallet, 
  Zap, 
  ArrowDownLeft, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Printer,
  Filter,
  X
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/estado-cuenta")({
  component: EstadoCuentaPage,
});

const PAGE_SIZE = 10;

const fmt = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Movimiento = {
  id: string;
  created_at: string;
  tipo: string;
  monto: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descripcion: string;
};

function EstadoCuentaPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  // Obtener perfil y saldo actual
  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile-estado-cuenta", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email, pseudonimo, balance")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const userBalance = Number(profile?.balance ?? 0);

  // Consulta de Movimientos
  const { data: result, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["estado-cuenta-movimientos", user?.id, page, fechaDesde, fechaHasta],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let queryCount = supabase
        .from("movimientos_cuenta")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      let queryData = supabase
        .from("movimientos_cuenta")
        .select("*")
        .eq("user_id", user!.id);

      if (fechaDesde) {
        const desdeISO = new Date(`${fechaDesde}T00:00:00`).toISOString();
        queryCount = queryCount.gte("created_at", desdeISO);
        queryData = queryData.gte("created_at", desdeISO);
      }

      if (fechaHasta) {
        const hastaISO = new Date(`${fechaHasta}T23:59:59.999`).toISOString();
        queryCount = queryCount.lte("created_at", hastaISO);
        queryData = queryData.lte("created_at", hastaISO);
      }

      const { count, error: countError } = await queryCount;
      if (countError) throw countError;

      const { data, error } = await queryData
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const totalRecords = count ?? 0;
      const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;

      return {
        movimientos: (data ?? []) as Movimiento[],
        totalRecords,
        totalPages,
      };
    },
  });

  const movimientos = result?.movimientos ?? [];
  const totalPages = result?.totalPages ?? 1;

  // Manejo de cambio de filtros sin efectos secundarios en el renderizado
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

  const handlePrint = () => {
    window.print();
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

      <div className="container mx-auto max-w-5xl px-4 py-6 text-slate-100 print-full-width">
        {/* Botón Volver e Imprimir */}
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#39ff14]"
          >
            <ArrowLeftCircle className="h-5 w-5" /> Volver al Dashboard
          </Link>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-slate-700 bg-[#24282d] text-slate-200 hover:bg-slate-800 hover:text-[#39ff14]"
          >
            <Printer className="mr-2 h-4 w-4" /> Exportar a PDF / Imprimir
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

        {/* Tarjeta del Estado de Cuenta */}
        <Card className="card-print overflow-hidden border-slate-800 bg-[#24282d] shadow-2xl">
          <div className="border-b border-slate-800 bg-black/10 p-6 text-center">
            <h3 className="flex items-center justify-center gap-2 text-2xl font-bold text-cyan-400 print:text-black">
              <Wallet className="h-6 w-6 no-print" /> Estado de Cuenta
            </h3>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="badge-print rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-mono text-xs text-slate-400">
                {profile?.pseudonimo || profile?.email || user?.email}
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-bold text-[#39ff14] print:text-black">
                Saldo Actual: Bs {fmt.format(userBalance)}
              </span>
            </div>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="table-print w-full text-left text-sm text-slate-300">
                <thead className="border-b border-slate-800 bg-black/20 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3">Fecha y Hora</th>
                    <th className="py-3.5 px-3">Tipo</th>
                    <th className="py-3.5 px-3 text-right">Monto (Bs.)</th>
                    <th className="py-3.5 px-3 text-right">Saldo Anterior</th>
                    <th className="py-3.5 px-3 text-right">Saldo Posterior</th>
                    <th className="py-3.5 pl-6 pr-4">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Cargando movimientos...
                      </td>
                    </tr>
                  ) : movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <Info className="h-5 w-5 text-slate-500" />
                          No se encontraron movimientos para el criterio seleccionado.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((m) => {
                      const esNegativo = m.monto < 0;
                      return (
                        <tr key={m.id} className="transition-colors hover:bg-slate-800/40">
                          <td className="whitespace-nowrap py-3 pl-4 pr-3 font-mono text-xs text-slate-400 print:text-black">
                            {new Date(m.created_at).toLocaleString("es-VE", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-3 px-3">
                            {esNegativo ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400 print:text-black">
                                <Zap className="h-4 w-4 no-print" /> {m.tipo}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-[#39ff14] print:text-black">
                                <ArrowDownLeft className="h-4 w-4 no-print" /> {m.tipo}
                              </span>
                            )}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-bold ${
                              esNegativo ? "text-red-500 print:text-black" : "text-[#39ff14] print:text-black"
                            }`}
                          >
                            {!esNegativo && "+ "}
                            {fmt.format(m.monto)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-xs text-slate-400 print:text-black">
                            {fmt.format(m.saldo_anterior)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-100 print:text-black">
                            {fmt.format(m.saldo_posterior)}
                          </td>
                          <td className="py-3 pl-6 pr-4 text-xs text-slate-400 print:text-black">
                            {m.descripcion}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>

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