import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, primaryRole, isAdmin, isAgency, loading } = useAuth();

  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold">Hola, {user?.email?.split("@")[0]}</h1>
      <p className="mb-8 text-muted-foreground">
        Tu rol actual: <span className="font-semibold text-accent">{loading ? "..." : primaryRole}</span>
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {isAdmin && (
          <>
            <StatCard title="Panel Admin" desc="Gestiona agencias, bancos y usuarios." />
            <StatCard title="Próximamente" desc="Hipódromos, programa y control de operaciones." />
          </>
        )}
        {isAgency && (
          <StatCard title="Panel Agencia" desc="Ver tus jugadores y condiciones (próximamente)." />
        )}
        {!isAdmin && !isAgency && (
          <StatCard title="Zona de Jugador" desc="Muy pronto podrás apostar y ver tus jugadas aquí." />
        )}
      </div>
    </div>
  );
}

function StatCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-muted-foreground">{desc}</p></CardContent>
    </Card>
  );
}
