import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  agency_id: number | null;
};

function UsersPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,email,name,agency_id").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfileRow[];
    },
    enabled: isAdmin,
  });

  const { data: rolesByUser = {} } = useQuery({
    queryKey: ["user_roles_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map: Record<string, AppRole[]> = {};
      (data ?? []).forEach((r) => {
        map[r.user_id] ??= [];
        map[r.user_id].push(r.role as AppRole);
      });
      return map;
    },
    enabled: isAdmin,
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ["agencies-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("id,name").order("name");
      if (error) throw error;
      return data as { id: number; name: string }[];
    },
    enabled: isAdmin,
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Reemplaza el rol primario: elimina admin/agency/player y asigna el nuevo
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_roles_all"] });
      toast.success("Rol actualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAgencyMutation = useMutation({
    mutationFn: async ({ userId, agencyId }: { userId: string; agencyId: number | null }) => {
      const { error } = await supabase.from("profiles").update({ agency_id: agencyId }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Agencia asignada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAdmin) return <div className="text-destructive">No tienes permiso para ver esta sección.</div>;

  const primary = (uid: string): AppRole => {
    const r = rolesByUser[uid] ?? [];
    if (r.includes("admin")) return "admin";
    if (r.includes("agency")) return "agency";
    return "player";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Usuarios y roles</h1>
        <p className="text-sm text-muted-foreground">Asigna a cada usuario su rol y agencia.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuarios registrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Agencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Select
                        value={primary(p.id)}
                        onValueChange={(v) => setRoleMutation.mutate({ userId: p.id, role: v as AppRole })}
                      >
                        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="player">Jugador</SelectItem>
                          <SelectItem value="agency">Agencia</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.agency_id ? String(p.agency_id) : "none"}
                        onValueChange={(v) =>
                          setAgencyMutation.mutate({ userId: p.id, agencyId: v === "none" ? null : Number(v) })
                        }
                      >
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin agencia</SelectItem>
                          {agencies.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const { error } = await supabase.auth.resetPasswordForEmail(p.email, {
                            redirectTo: `${window.location.origin}/reset-password`,
                          });
                          if (error) toast.error(error.message);
                          else toast.success("Correo de recuperación enviado");
                        }}
                      >
                        Reset pass
                      </Button>
                    </TableCell>
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
