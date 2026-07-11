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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/withdraw")({
  component: WithdrawPage,
});

const schema = z.object({
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  bank_id: z.string().min(1, "Selecciona un banco"),
  account_number: z.string().trim().min(4, "Cuenta muy corta").max(30),
  account_holder: z.string().trim().min(2, "Nombre muy corto").max(120),
  identity_card: z.string().trim().min(4, "Cédula inválida").max(20),
});

function WithdrawPage() {
  const { user, isPlayer, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [identityCard, setIdentityCard] = useState("");

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, identity_card, agency_id, balance")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banks").select("id,name").order("name");
      if (error) throw error;
      return data as { id: number; name: string }[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error("Perfil no cargado");
      const parsed = schema.safeParse({ amount, bank_id: bankId, account_number: accountNumber, account_holder: accountHolder, identity_card: identityCard });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (Number(profile.balance ?? 0) < parsed.data.amount) throw new Error("Saldo insuficiente");

      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        agency_id: profile.agency_id,
        amount: parsed.data.amount,
        bank_id: Number(parsed.data.bank_id),
        account_number: parsed.data.account_number,
        account_holder: parsed.data.account_holder,
        identity_card: parsed.data.identity_card,
        status: "pendiente",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Retiro solicitado. Espera la aprobación de tu agencia.");
      setAmount(""); setBankId(""); setAccountNumber(""); setAccountHolder(""); setIdentityCard("");
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authLoading) return <div className="text-muted-foreground">Cargando...</div>;
  if (!isPlayer) return <div className="text-destructive">Esta sección es para jugadores.</div>;

  const balance = Number(profile?.balance ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Solicitar retiro</h1>
        <p className="text-sm text-muted-foreground">Indica la cuenta bancaria a donde deseas recibir el pago.</p>
      </div>

      {!profile?.agency_id ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No tienes una agencia asignada. Contacta al administrador.</CardContent></Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Saldo disponible</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">Bs {balance.toFixed(2)}</div>
              <p className="mt-2 text-xs text-muted-foreground">El monto retirado se descontará al ser aprobado por tu agencia.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Datos del retiro</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}>
                <div className="space-y-2">
                  <Label htmlFor="amt">Monto (Bs)</Label>
                  <Input id="amt" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco destino</Label>
                  <Select value={bankId} onValueChange={setBankId}>
                    <SelectTrigger id="bank"><SelectValue placeholder="Selecciona un banco" /></SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acc">Número de cuenta / teléfono</Label>
                  <Input id="acc" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hold">Titular de la cuenta</Label>
                  <Input id="hold" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ci">Cédula del titular</Label>
                  <Input id="ci" value={identityCard} onChange={(e) => setIdentityCard(e.target.value)} required />
                </div>
                <Button type="submit" disabled={submit.isPending} className="w-full">
                  <Wallet className="mr-2 h-4 w-4" />
                  {submit.isPending ? "Enviando..." : "Solicitar retiro"}
                </Button>
              </form>
              <p className="mt-4 text-xs text-muted-foreground">
                Consulta el estado en <Link to="/my-withdrawals" className="underline">Mis retiros</Link>.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
