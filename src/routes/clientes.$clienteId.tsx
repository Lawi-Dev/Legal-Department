import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ExternalLink, Eye, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, PrazoChip, StatusChip } from "@/components/chips";
import { CLIENTES, DEMANDAS, clientePorId, formatarData } from "@/lib/legal-data";

export const Route = createFileRoute("/clientes/$clienteId")({
  loader: ({ params }) => {
    const cliente = clientePorId(params.clienteId);
    if (!cliente) throw notFound();
    return { cliente };
  },
  head: ({ loaderData }) => {
    const nome = loaderData?.cliente.nome ?? "Cliente";
    return {
      meta: [
        { title: `${nome} — Ficha do cliente | Lawi Hub` },
        {
          name: "description",
          content: `Ficha 360 de ${nome}: horas do mês, demandas abertas e histórico de atividades do jurídico.`,
        },
        { property: "og:title", content: `${nome} — Ficha do cliente | Lawi Hub` },
        {
          property: "og:description",
          content: `Horas do mês, demandas abertas e histórico de atividades de ${nome}.`,
        },
      ],
    };
  },
  component: FichaCliente,
});

type Historico = {
  data: string;
  advogado: string;
  descricao: string;
  minutos: number;
  visivelCliente: boolean;
};

function FichaCliente() {
  const { cliente } = Route.useLoaderData();
  const demandas = DEMANDAS.filter((d) => d.clienteId === cliente.id);
  const abertas = demandas
    .filter((d) => d.status !== "Finalizado")
    .sort((a, b) => a.prazoFatal.localeCompare(b.prazoFatal));

  const historico: Historico[] = demandas
    .flatMap((d) =>
      d.atividades.map((a) => ({
        data: a.data,
        advogado: a.advogado,
        descricao: `${a.descricao} (${d.id})`,
        minutos: a.minutos,
        visivelCliente: a.visivelCliente,
      })),
    )
    .sort((a, b) => b.data.localeCompare(a.data));

  const pct = Math.min(100, Math.round((cliente.horasUsadas / cliente.horasContratadas) * 100));
  const excedido = cliente.horasUsadas > cliente.horasContratadas;

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Link to="/clientes" className="text-sm text-muted-foreground hover:text-teal">
          ← Clientes
        </Link>

        <div className="card-surface mt-3 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{cliente.nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {cliente.segmento} · Responsável:{" "}
              <span className="text-foreground">{cliente.responsavel}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Chip tone="neutral">Idioma: {cliente.idioma}</Chip>
            <a
              href={cliente.driveUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-teal inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <ExternalLink className="h-4 w-4" /> Abrir pasta no Drive
            </a>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">Créditos / horas do mês</h2>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {cliente.horasUsadas.toFixed(1)}h
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {cliente.horasContratadas}h
              </span>
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={excedido ? "h-full bg-danger" : "h-full bg-teal"}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {excedido
                ? `Pacote excedido em ${(cliente.horasUsadas - cliente.horasContratadas).toFixed(1)}h`
                : `${(cliente.horasContratadas - cliente.horasUsadas).toFixed(1)}h disponíveis · agosto/2026`}
            </p>
          </div>

          <div className="card-surface p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-foreground">Demandas abertas</h2>
            <ul className="mt-3 divide-y divide-border">
              {abertas.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link
                    to="/demandas/$demandaId"
                    params={{ demandaId: d.id }}
                    className="text-sm font-medium text-foreground hover:text-teal"
                  >
                    {d.titulo}
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusChip status={d.status} />
                    <PrazoChip prazo={d.prazoFatal} />
                  </div>
                </li>
              ))}
              {abertas.length === 0 && (
                <li className="py-4 text-sm text-muted-foreground">Nenhuma demanda aberta.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="card-surface mt-4 p-5">
          <h2 className="text-sm font-semibold text-foreground">Histórico de atividades</h2>
          <ol className="mt-4 border-l border-border pl-5">
            {historico.map((h, i) => (
              <li key={i} className="relative pb-6 last:pb-0">
                <span className="absolute top-1.5 -left-[1.6rem] h-2.5 w-2.5 rounded-full bg-teal" />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatarData(h.data)}</span>
                  <span>·</span>
                  <span className="text-foreground">{h.advogado}</span>
                  <span>·</span>
                  <span>{h.minutos} min</span>
                  <Chip tone={h.visivelCliente ? "teal" : "neutral"}>
                    {h.visivelCliente ? (
                      <>
                        <Eye className="h-3 w-3" /> visível ao cliente
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> interno
                      </>
                    )}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-foreground">{h.descricao}</p>
              </li>
            ))}
            {historico.length === 0 && (
              <li className="text-sm text-muted-foreground">Sem atividades registradas.</li>
            )}
          </ol>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Outras contas:{" "}
          {CLIENTES.filter((c) => c.id !== cliente.id).map((c, i) => (
            <span key={c.id}>
              {i > 0 && " · "}
              <Link
                to="/clientes/$clienteId"
                params={{ clienteId: c.id }}
                className="hover:text-teal"
              >
                {c.nome}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </AppShell>
  );
}
