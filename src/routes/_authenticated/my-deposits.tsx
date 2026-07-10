import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/my-deposits")({
  component: MyDepositsPage,
});

type Transfer = {
  id: string;
  reference: string;
  amount: number;
  status: "pendiente" | "aprobado" | "rechazado";
  observations: string | null;
  created_at: string;
  reviewed_at: string | null;
  agencies: { name: string } | null;
};

function MyDepositsPage() {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-deposits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("id, reference, amount, status, observations, created_at, reviewed_at, agencies(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Transfer[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis depósitos</h1>
        <p className="text-sm text-muted-foreground">Historial y estado de tus depósitos a la agencia.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tienes depósitos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleString("es-VE")}</TableCell>
                    <TableCell>{t.agencies?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono">{t.reference}</TableCell>
                    <TableCell>Bs {Number(t.amount).toFixed(2)}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.observations || "—"}</TableCell>
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

function StatusBadge({ status }: { status: Transfer["status"] }) {
  const map = {
    pendiente: { text: "Pendiente", cls: "bg-yellow-500/20 text-yellow-500 border-yellow-500/40" },
    aprobado: { text: "Aprobado", cls: "bg-primary/20 text-primary border-primary/40" },
    rechazado: { text: "Rechazado", cls: "bg-destructive/20 text-destructive border-destructive/40" },
  }[status];
  return <Badge variant="outline" className={map.cls}>{map.text}</Badge>;
}
