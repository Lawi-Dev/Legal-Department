import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Eye, Link2, Lock, Plus, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, PrazoChip, StatusChip } from "@/components/chips";
import { DEMANDAS, formatarData, nomeCliente, type Demanda } from "@/lib/legal-data";

export const Route = createFileRoute("/demandas/$demandaId")({
  loader: ({ params }): { demanda: Demanda } => {
    const demanda = DEMANDAS.find((d) => d.id === params.demandaId);
    if (!demanda) throw notFound();
    return { demanda };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData?.demanda.titulo ?? "Demanda";
    return {
      meta: [
        { title: `${titulo} — Demanda | Lawi Hub` },
        {
          name: "description",
          content: `Detalhe da demanda jurídica: tipo, responsável, status, prazos, links e log de atividade.`,
        },
        { property: "og:title", content: `${titulo} — Demanda | Lawi Hub` },
        {
          property: "og:description",
          content: "Detalhe da demanda jurídica com prazos, links e log de atividade.",
        },
      ],
    };
  },
  component: DetalheDemanda,
});

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function DetalheDemanda() {
  const { demanda } = Route.useLoaderData() as { demanda: Demanda };
  const [status, setStatus] = useState(demanda.status);
  const [aviso, setAviso] = useState(true);
  const [dias, setDias] = useState(demanda.avisoDiasAntes);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-teal">
          ← Meus Casos
        </Link>

        <div className="card-surface mt-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{demanda.id}</p>
              <h1 className="mt-1 text-2xl font-semibold text-foreground">{demanda.titulo}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusChip status={status} />
                <PrazoChip prazo={demanda.prazoFatal} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatus("Respondido")}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Send className="h-4 w-4" /> Marcar como Respondido
              </button>
              <button
                type="button"
                onClick={() => setStatus("Finalizado")}
                className="btn-teal inline-flex items-center gap-2 px-4 py-2 text-sm"
              >
                <CheckCircle2 className="h-4 w-4" /> Marcar como Finalizado
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="card-surface space-y-5 p-5 lg:col-span-2">
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo label="Cliente">
                <Link
                  to="/clientes/$clienteId"
                  params={{ clienteId: demanda.clienteId }}
                  className="hover:text-teal"
                >
                  {nomeCliente(demanda.clienteId)}
                </Link>
              </Campo>
              <Campo label="Tipo">{demanda.tipo}</Campo>
              <Campo label="Responsável">{demanda.responsavel}</Campo>
              <Campo label="Status">{status}</Campo>
              <Campo label="Prazo fatal">{formatarData(demanda.prazoFatal)}</Campo>
              <Campo label="Prazo gerencial">{formatarData(demanda.prazoGerencial)}</Campo>
            </div>

            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Descrição</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{demanda.descricao}</p>
            </div>

            {demanda.processo && (
              <div className="rounded-lg border border-border bg-secondary/60 p-4">
                <p className="text-sm font-semibold text-foreground">Dados do processo administrativo</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Campo label="Nº do processo">{demanda.processo.numero}</Campo>
                  <Campo label="Parte / consumidor">{demanda.processo.parte}</Campo>
                  <Campo label="Órgão">{demanda.processo.orgao}</Campo>
                  <Campo label="Código de acesso">
                    <span className="font-mono">{demanda.processo.codigoAcesso}</span>
                  </Campo>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Links</p>
              <ul className="mt-2 space-y-2">
                {demanda.links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-foreground hover:text-teal"
                    >
                      <Link2 className="h-4 w-4 text-teal" />
                      {l.label}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card-surface h-fit p-5">
            <h2 className="text-sm font-semibold text-foreground">Bloco de prazo</h2>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prazo fatal</span>
                <PrazoChip prazo={demanda.prazoFatal} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Prazo gerencial</span>
                <Chip tone="neutral">{formatarData(demanda.prazoGerencial)}</Chip>
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={aviso}
                onChange={(e) => setAviso(e.target.checked)}
                className="h-4 w-4 accent-[var(--teal)]"
              />
              Avisar por e-mail
            </label>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="number"
                min={1}
                max={30}
                value={dias}
                disabled={!aviso}
                onChange={(e) => setDias(Number(e.target.value))}
                className="h-9 w-16 rounded-lg border border-border bg-card px-2 text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              dias antes do prazo fatal
            </div>
          </div>
        </div>

        <div className="card-surface mt-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Log de atividade</h2>
            <button
              type="button"
              className="btn-teal inline-flex items-center gap-2 px-3.5 py-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Registrar atividade
            </button>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {demanda.atividades.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-foreground">{a.descricao}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatarData(a.data)} · {a.advogado} · {a.minutos} min
                  </p>
                </div>
                <Chip tone={a.visivelCliente ? "teal" : "neutral"}>
                  {a.visivelCliente ? (
                    <>
                      <Eye className="h-3 w-3" /> visível ao cliente
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> interno
                    </>
                  )}
                </Chip>
              </li>
            ))}
            {demanda.atividades.length === 0 && (
              <li className="py-4 text-sm text-muted-foreground">
                Nenhuma atividade registrada nesta demanda.
              </li>
            )}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
