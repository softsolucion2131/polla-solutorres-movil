import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Check, X, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agency/withdrawals")({
  component: AgencyWithdrawalsPage,
});

type Row = {
  id: string;
  user_id: string;
  amount: number;
  account_number: string;
  account_holder: string | null;
  identity_card: string | null;
  status: "pendiente" | "aprobado" | "rechazado";
  observations: string | null;
  reference_payment: string | null;
  created_at: string;
  banks: { name: string } | null;
  profiles: { name: string; email: string; phone: string | null; balance: number | null } | null;
};

function AgencyWithdrawalsPage() {
  const { user, isAgency, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Row | null>(null);
  const [obs, setObs] = useState("");
  const [reference, setReference] = useState("");

  const { data = [], isLoading } = useQuery({
    enabled: !!user && (isAgency || isAdmin),
    queryKey: ["agency-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id, user_id, amount, account_number, account_holder, identity_card, status, observations, reference_payment, created_at, banks(name), profiles!withdrawals_user_id_fkey(name, email, phone, balance)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprobado" | "rechazado" }) => {
      if (status === "aprobado" && !reference.trim()) throw new Error("Debes indicar la referencia del pago");
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status,
          observations: obs || (status === "aprobado" ? "Aprobado" : "Rechazado"),
          reference_payment: status === "aprobado" ? reference.trim() : null,
          reviewed_by: user!.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "aprobado" ? "Retiro aprobado" : "Retiro rechazado");
      qc.invalidateQueries({ queryKey: ["agency-withdrawals"] });
      setSelected(null); setObs(""); setReference("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openDetails = (r: Row) => {
    setSelected(r);
    setObs(r.observations ?? "");
    setReference(r.reference_payment ?? "");
  };

  if (loading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAgency && !isAdmin) return <div className="text-destructive">Sección solo para agencias.</div>;

  const pendientes = data.filter((r) => r.status === "pendiente");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Retiros solicitados</h1>
        <p className="text-sm text-muted-foreground">
          Revisa, aprueba o rechaza los retiros de tus jugadores.
          {pendientes.length > 0 && (
            <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
              {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Retiros</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay retiros solicitados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString("es-VE")}</TableCell>
                    <TableCell>{r.profiles?.name || r.profiles?.email || "—"}</TableCell>
                    <TableCell>{r.banks?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono">{r.account_number}</TableCell>
                    <TableCell>Bs {Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openDetails(r)}>
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

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) { setSelected(null); setObs(""); setReference(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalle del retiro</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Info label="Jugador" value={selected.profiles?.name || "—"} />
              <Info label="Saldo actual" value={`Bs ${Number(selected.profiles?.balance ?? 0).toFixed(2)}`} />
              <Info label="Banco" value={selected.banks?.name ?? "—"} />
              <Info label="Cuenta" value={selected.account_number} />
              <Info label="Titular" value={selected.account_holder || "—"} />
              <Info label="Cédula" value={selected.identity_card || "—"} />
              <Info label="Monto" value={`Bs ${Number(selected.amount).toFixed(2)}`} />
              <Info label="Estado" value={selected.status} />
              {selected.status === "pendiente" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Referencia del pago (al aprobar)</label>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ej: 001234" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Observaciones</label>
                    <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
                  </div>
                </>
              )}
              {selected.status !== "pendiente" && selected.reference_payment && (
                <Info label="Referencia" value={selected.reference_payment} />
              )}
            </div>
          )}
          {selected?.status === "pendiente" && (
            <DialogFooter className="gap-2">
              <Button variant="destructive" disabled={review.isPending} onClick={() => review.mutate({ id: selected.id, status: "rechazado" })}>
                <X className="mr-2 h-4 w-4" /> Rechazar
              </Button>
              <Button disabled={review.isPending} onClick={() => review.mutate({ id: selected.id, status: "aprobado" })}>
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

function StatusBadge({ status }: { status: Row["status"] }) {
  const map = {
    pendiente: { text: "Pendiente", cls: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" },
    aprobado: { text: "Aprobado", cls: "bg-primary/20 text-primary border-primary/40" },
    rechazado: { text: "Rechazado", cls: "bg-destructive/20 text-destructive border-destructive/40" },
  }[status];
  return <Badge variant="outline" className={map.cls}>{map.text}</Badge>;
}
