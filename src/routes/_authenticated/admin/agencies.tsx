import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/agencies")({
  component: AgenciesPage,
});

type Agency = {
  id: number;
  name: string;
  rif: string;
  phone: string;
  porcentaje: number;
  bank_id: number | null;
  activo: boolean;
};

const agencySchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(100),
  rif: z.string().trim().max(15).default(""),
  phone: z.string().trim().max(15).default(""),
  porcentaje: z.coerce.number().min(0).max(100),
  bank_id: z.coerce.number().int().positive().nullable(),
  activo: z.boolean(),
});

function AgenciesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agencies").select("*").order("id");
      if (error) throw error;
      return data as Agency[];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banks").select("id,name").order("name");
      if (error) throw error;
      return data as { id: number; name: string }[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: z.infer<typeof agencySchema> & { id?: number }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("agencies").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("agencies").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agencies"] });
      setOpen(false); setEditing(null);
      toast.success("Agencia guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("agencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agencies"] });
      toast.success("Agencia eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isAdmin) return <div className="text-destructive">No tienes permiso para ver esta sección.</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agencias</h1>
          <p className="text-sm text-muted-foreground">Administra las agencias del sistema.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva agencia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar agencia" : "Nueva agencia"}</DialogTitle>
            </DialogHeader>
            <AgencyForm
              banks={banks}
              initial={editing}
              onSubmit={(values) => saveMutation.mutate({ ...values, id: editing?.id })}
              submitting={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Listado</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando agencias...</p>
          ) : agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay agencias. Crea la primera.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RIF</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencies.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.id}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.rif || "—"}</TableCell>
                    <TableCell>{a.phone || "—"}</TableCell>
                    <TableCell>{Number(a.porcentaje).toFixed(2)}%</TableCell>
                    <TableCell>{banks.find((b) => b.id === a.bank_id)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <span className={a.activo ? "text-primary" : "text-muted-foreground"}>
                        {a.activo ? "Sí" : "No"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm(`¿Eliminar "${a.name}"?`)) deleteMutation.mutate(a.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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

function AgencyForm({
  initial, banks, onSubmit, submitting,
}: {
  initial: Agency | null;
  banks: { id: number; name: string }[];
  onSubmit: (values: z.infer<typeof agencySchema>) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [rif, setRif] = useState(initial?.rif ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [porcentaje, setPorcentaje] = useState(String(initial?.porcentaje ?? "0"));
  const [bankId, setBankId] = useState<string>(initial?.bank_id ? String(initial.bank_id) : "");
  const [activo, setActivo] = useState<boolean>(initial?.activo ?? true);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = agencySchema.safeParse({
      name, rif, phone, porcentaje,
      bank_id: bankId ? Number(bankId) : null,
      activo,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ag-name">Nombre</Label>
        <Input id="ag-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ag-rif">RIF</Label>
          <Input id="ag-rif" value={rif} onChange={(e) => setRif(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ag-phone">Teléfono</Label>
          <Input id="ag-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="ag-porc">% Comisión</Label>
          <Input id="ag-porc" type="number" step="0.01" min="0" max="100" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Banco</Label>
          <Select value={bankId} onValueChange={setBankId}>
            <SelectTrigger><SelectValue placeholder="Selecciona banco" /></SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="ag-activo" checked={activo} onCheckedChange={setActivo} />
        <Label htmlFor="ag-activo">Activa</Label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
