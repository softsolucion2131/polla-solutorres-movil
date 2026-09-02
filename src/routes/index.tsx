import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary" />
          <span className="font-display text-xl font-bold text-foreground">Turf Bet</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/auth" search={{ mode: "signin" as const }}><Button variant="ghost">Iniciar sesión</Button></Link>
          <Link to="/auth" search={{ mode: "signup" as const }}>
            <Button>Registrarse</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="text-center">
          <p className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
            Plataforma hípica
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight text-foreground md:text-6xl">
            Apuesta, gestiona y gana en un solo lugar.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Sistema completo para jugadores, agencias y administradores. Registra tu cuenta y
            empieza a operar en los mejores hipódromos.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" as const }}>
              <Button size="lg" className="shadow-[var(--shadow-glow)]">Crear cuenta gratis</Button>
            </Link>
            <Link to="/auth" search={{ mode: "signin" as const }}>
              <Button size="lg" variant="outline">Ya tengo cuenta</Button>
            </Link>
          </div>
        </section>

        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            { t: "Jugador", d: "Recarga saldo, apuesta en tus hipódromos favoritos y revisa tus premios en tiempo real." },
            { t: "Agencia", d: "Administra a tus jugadores, condiciones y dividendos con reportes claros." },
            { t: "Administrador", d: "CRUD completo de agencias, bancos, hipódromos y control de operaciones." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 inline-block rounded-md bg-accent/20 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                {c.t}
              </div>
              <p className="text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Turf Bet. Todos los derechos reservados.
      </footer>
    </div>
  );
}
