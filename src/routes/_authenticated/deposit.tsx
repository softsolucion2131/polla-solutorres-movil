import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Phone, IdCard, Landmark, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/deposit")({
  component: DepositPage,
});

const depositSchema = z.object({
  reference: z.string().trim().min(4, "Referencia muy corta").max(30),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
});

function DepositPage() {
  const { user, isPlayer, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, identity_card, agency_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: agency, isLoading: agencyLoading } = useQuery({
    enabled: !!profile?.agency_id,
    queryKey: ["my-agency", profile?.agency_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name, rif, phone, bank_id, banks(name)")
        .eq("id", profile!.agency_id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        id: number; name: string; rif: string; phone: string;
        bank_id: number | null; banks: { name: string } | null;
      };
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !agency) throw new Error("Datos incompletos");
      const parsed = depositSchema.safeParse({ reference, amount });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);

      let capture_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("captures").upload(path, file);
        if (upErr) throw upErr;
        capture_url = path;
      }

      const { error } = await supabase.from("transfers").insert({
        user_id: user.id,
        agency_id: agency.id,
        bank_id: agency.bank_id,
        reference: parsed.data.reference,
        amount: parsed.data.amount,
        capture_url,
        status: "pendiente",
        observations: "Pendiente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Depósito enviado. Espera la aprobación de tu agencia.");
      setReference(""); setAmount(""); setFile(null);
      qc.invalidateQueries({ queryKey: ["my-deposits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isPlayer) return <div className="text-destructive">Esta sección es para jugadores.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Depositar a mi agencia</h1>
        <p className="text-sm text-muted-foreground">
          Realiza el pago móvil con los datos siguientes y registra el comprobante.
        </p>
      </div>

      {!profile?.agency_id ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No tienes una agencia asignada. Contacta al administrador.
          </CardContent>
        </Card>
      ) : agencyLoading || !agency ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Cargando agencia...</CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos de tu agencia</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row icon={<Building2 className="h-4 w-4" />} label="Nombre" value={agency.name} />
              <Row icon={<IdCard className="h-4 w-4" />} label="RIF" value={agency.rif || "—"} />
              <Row icon={<Phone className="h-4 w-4" />} label="Teléfono / Pago móvil" value={agency.phone || "—"} />
              <Row icon={<Landmark className="h-4 w-4" />} label="Banco" value={agency.banks?.name ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Registrar depósito</CardTitle></CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
              >
                <div className="space-y-2">
                  <Label htmlFor="ref">Referencia del pago</Label>
                  <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amt">Monto (Bs)</Label>
                  <Input id="amt" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cap">Captura del pago móvil</Label>
                  <Input id="cap" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button type="submit" disabled={submit.isPending} className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  {submit.isPending ? "Enviando..." : "Enviar depósito"}
                </Button>
              </form>
              <p className="mt-4 text-xs text-muted-foreground">
                Consulta el estado en <Link to="/my-deposits" className="underline">Mis depósitos</Link>.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
      <span className="flex items-center gap-2 text-muted-foreground">{icon} {label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
