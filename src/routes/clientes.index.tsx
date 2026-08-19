import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Chip } from "@/components/chips";
import { CLIENTES, DEMANDAS } from "@/lib/legal-data";

export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Legal Department | Lawi Hub" },
      {
        name: "description",
        content:
          "Carteira de clientes do jurídico da Lawi Hub com advogado responsável, idioma e consumo de horas do mês.",
      },
      { property: "og:title", content: "Clientes — Legal Department | Lawi Hub" },
      {
        property: "og:description",
        content: "Carteira de clientes do jurídico com responsável, idioma e horas consumidas.",
      },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <h1 className="text-2xl font-semibold text-foreground">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {CLIENTES.length} contas ativas atendidas pelo time jurídico
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CLIENTES.map((c) => {
            const abertas = DEMANDAS.filter(
              (d) => d.clienteId === c.id && d.status !== "Finalizado",
            ).length;
            const pct = Math.min(100, Math.round((c.horasUsadas / c.horasContratadas) * 100));
            const excedido = c.horasUsadas > c.horasContratadas;
            return (
              <Link
                key={c.id}
                to="/clientes/$clienteId"
                params={{ clienteId: c.id }}
                className="card-surface block p-5 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{c.nome}</h2>
                    <p className="text-xs text-muted-foreground">{c.segmento}</p>
                  </div>
                  <Chip tone="neutral">{c.idioma}</Chip>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Responsável: <span className="text-foreground">{c.responsavel}</span>
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Horas do mês</span>
                    <span className={excedido ? "text-danger" : ""}>
                      {c.horasUsadas.toFixed(1)}h / {c.horasContratadas}h
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={excedido ? "h-full bg-danger" : "h-full bg-teal"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {abertas} demanda{abertas === 1 ? "" : "s"} aberta{abertas === 1 ? "" : "s"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
