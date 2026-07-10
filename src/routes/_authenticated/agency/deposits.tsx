import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agency/deposits")({
  component: AgencyDepositsPage,
});

type AgencyTransfer = {
  id: string;
  user_id: string;
  reference: string;
  amount: number;
  status: "pendiente" | "aprobado" | "rechazado";
  observations: string | null;
  capture_url: string | null;
  created_at: string;
  profiles: { name: string; identity_card: string | null; phone: string | null; email: string } | null;
};

function AgencyDepositsPage() {
  const { user, isAgency, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<AgencyTransfer | null>(null);
  const [obs, setObs] = useState("");
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    enabled: !!user && (isAgency || isAdmin),
    queryKey: ["agency-deposits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("id, user_id, reference, amount, status, observations, capture_url, created_at, profiles!transfers_user_id_fkey(name, identity_card, phone, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as AgencyTransfer[];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprobado" | "rechazado" }) => {
      const { error } = await supabase
        .from("transfers")
        .update({
          status,
          observations: obs || (status === "aprobado" ? "Aprobado" : "Rechazado"),
          reviewed_by: user!.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "aprobado" ? "Depósito aprobado" : "Depósito rechazado");
      qc.invalidateQueries({ queryKey: ["agency-deposits"] });
      setSelected(null); setObs("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetails = async (t: AgencyTransfer) => {
    setSelected(t);
    setObs(t.observations ?? "");
    setCaptureUrl(null);
    if (t.capture_url) {
      const { data } = await supabase.storage.from("captures").createSignedUrl(t.capture_url, 300);
      setCaptureUrl(data?.signedUrl ?? null);
    }
  };

  if (loading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAgency && !isAdmin) return <div className="text-destructive">Sección solo para agencias.</div>;

  const pendientes = data.filter((t) => t.status === "pendiente");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Depósitos recibidos</h1>
        <p className="text-sm text-muted-foreground">
          Revisa, aprueba o rechaza los depósitos de tus jugadores.
          {pendientes.length > 0 && (
            <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
              {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Depósitos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay depósitos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleString("es-VE")}</TableCell>
                    <TableCell>{t.profiles?.name || t.profiles?.email || "—"}</TableCell>
                    <TableCell>{t.profiles?.identity_card || "—"}</TableCell>
                    <TableCell className="font-mono">{t.reference}</TableCell>
                    <TableCell>Bs {Number(t.amount).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openDetails(t)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setObs(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del depósito</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Info label="Jugador" value={selected.profiles?.name || "—"} />
              <Info label="Cédula" value={selected.profiles?.identity_card || "—"} />
              <Info label="Teléfono" value={selected.profiles?.phone || "—"} />
              <Info label="Referencia" value={selected.reference} />
              <Info label="Monto" value={`Bs ${Number(selected.amount).toFixed(2)}`} />
              <Info label="Estado" value={selected.status} />
              {captureUrl && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">Captura:</span>
                  <a href={captureUrl} target="_blank" rel="noreferrer">
                    <img src={captureUrl} alt="Captura del pago" className="max-h-64 rounded border border-border" />
                  </a>
                </div>
              )}
              {selected.status === "pendiente" && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Observaciones</label>
                  <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
                </div>
              )}
            </div>
          )}
          {selected?.status === "pendiente" && (
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                disabled={review.isPending}
                onClick={() => review.mutate({ id: selected.id, status: "rechazado" })}
              >
                <X className="mr-2 h-4 w-4" /> Rechazar
              </Button>
              <Button
                disabled={review.isPending}
                onClick={() => review.mutate({ id: selected.id, status: "aprobado" })}
              >
                <Check className="mr-2 h-4 w-4" /> Aprobar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: AgencyTransfer["status"] }) {
  const map = {
    pendiente: { text: "Pendiente", cls: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" },
    aprobado: { text: "Aprobado", cls: "bg-primary/20 text-primary border-primary/40" },
    rechazado: { text: "Rechazado", cls: "bg-destructive/20 text-destructive border-destructive/40" },
  }[status];
  return <Badge variant="outline" className={map.cls}>{map.text}</Badge>;
}
