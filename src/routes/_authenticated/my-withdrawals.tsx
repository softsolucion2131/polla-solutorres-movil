import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/my-withdrawals")({
  component: MyWithdrawalsPage,
});

type Row = {
  id: string;
  amount: number;
  account_number: string;
  account_holder: string | null;
  status: "pendiente" | "aprobado" | "rechazado";
  observations: string | null;
  reference_payment: string | null;
  created_at: string;
  banks: { name: string } | null;
};

function MyWithdrawalsPage() {
  const { user, isPlayer, loading } = useAuth();

  const { data = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-withdrawals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("id, amount, account_number, account_holder, status, observations, reference_payment, created_at, banks(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  if (loading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isPlayer) return <div className="text-destructive">Sección solo para jugadores.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis retiros</h1>
        <p className="text-sm text-muted-foreground">Historial de solicitudes de retiro y su estado.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Solicitudes</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no has solicitado retiros.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString("es-VE")}</TableCell>
                    <TableCell>{r.banks?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono">{r.account_number}</TableCell>
                    <TableCell>Bs {Number(r.amount).toFixed(2)}</TableCell>
                    <TableCell className="font-mono">{r.reference_payment || "—"}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.observations || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
