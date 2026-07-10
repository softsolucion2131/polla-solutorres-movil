import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(mode);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary" />
          <span className="font-display text-xl font-bold text-foreground">Turf Bet</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Accede a tu cuenta</CardTitle>
            <CardDescription>Ingresa o crea tu cuenta para empezar a jugar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><SignInForm onSuccess={() => navigate({ to: "/dashboard" })} /></TabsContent>
              <TabsContent value="signup"><SignUpForm onSuccess={() => navigate({ to: "/dashboard" })} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bienvenido");
    onSuccess();
  };

  const handleReset = async () => {
    if (!email) { toast.error("Escribe tu email para recuperar la contraseña"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Te enviamos un correo para restablecer tu contraseña");
  };

  return (
    <form onSubmit={handle} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-pass">Contraseña</Label>
        <Input id="si-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Iniciar sesión"}
      </Button>
      <button type="button" onClick={handleReset} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}

const signUpSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  agencyId: z.string().min(1, "Selecciona una agencia"),
});

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: agencies = [], isLoading: loadingAgencies } = useQuery({
    queryKey: ["agencies-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies")
        .select("id,name")
        .eq("activo", true)
        .order("name");
      if (error) throw error;
      return data as { id: number; name: string }[];
    },
  });

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ name, email, password, agencyId });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: parsed.data.name, agency_id: parsed.data.agencyId },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta creada. Bienvenido.");
    onSuccess();
  };

  return (
    <form onSubmit={handle} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Nombre completo</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-pass">Contraseña</Label>
        <Input id="su-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-agency">Agencia</Label>
        <Select value={agencyId} onValueChange={setAgencyId}>
          <SelectTrigger id="su-agency">
            <SelectValue placeholder={loadingAgencies ? "Cargando agencias..." : "Selecciona tu agencia"} />
          </SelectTrigger>
          <SelectContent>
            {agencies.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creando..." : "Crear cuenta"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Todos los usuarios entran como Jugador. El Administrador puede promoverte a Agencia.
      </p>
    </form>
  );
}
