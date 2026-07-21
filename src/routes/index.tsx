import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FieldCredit — Crédito de campo simplificado" },
      {
        name: "description",
        content:
          "FieldCredit: plataforma para gestionar créditos de campo de forma ágil, transparente y segura.",
      },
      { property: "og:title", content: "FieldCredit" },
      {
        property: "og:description",
        content:
          "Plataforma para gestionar créditos de campo de forma ágil, transparente y segura.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-block h-6 w-6 rounded-md bg-primary" />
            FieldCredit
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Características
            </a>
            <a href="#about" className="hover:text-foreground">
              Acerca
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-24">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Crédito de campo, simplificado.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            FieldCredit es la base para gestionar solicitudes, evaluaciones y
            desembolsos de crédito agrícola en un solo lugar.
          </p>
          <div className="mt-8 flex gap-3">
            <button className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Comenzar
            </button>
            <button className="rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent">
              Saber más
            </button>
          </div>
        </section>

        <section id="features" className="grid gap-6 py-16 sm:grid-cols-3">
          {[
            { title: "Solicitudes", desc: "Captura y seguimiento en campo." },
            { title: "Evaluación", desc: "Reglas y scoring configurables." },
            { title: "Desembolsos", desc: "Trazabilidad de principio a fin." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-6 text-card-foreground"
            >
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} FieldCredit
        </div>
      </footer>
    </div>
  );
}
