import { createFileRoute, Link } from "@tanstack/react-router";
import { AlarmClock, AlertTriangle, CheckCircle2, Clock, Layers, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  CLIENTES,
  DEMANDAS,
  FATURAMENTO_LABEL,
  TIPOS_TAREFA,
  diasRestantes,
  faturamentoDe,
  formatarData,
  nomeCliente,
  slaInfo,
  type Faturamento,
  type StatusDemanda,
} from "@/lib/legal-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Legal Department | Lawi Hub" },
      { name: "description", content: "Visão de gestão do jurídico da Lawi: SLA de 48h, prazos, carga por cliente e faturamento." },
    ],
  }),
  component: DashboardPage,
});

/* paleta espelhada do design system das Tarefas */
const T = {
  teal: { bg: "oklch(0.964 0.018 196.9)", fg: "oklch(0.268 0.05 231.2)", bd: "oklch(0.732 0.117 194.9 / 0.4)", dot: "oklch(0.732 0.117 194.9)" },
  amber: { bg: "oklch(0.962 0.058 95.6)", fg: "oklch(0.408 0.116 38.2)", bd: "oklch(0.769 0.165 70.1 / 0.4)", dot: "oklch(0.769 0.165 70.1)" },
  danger: { bg: "oklch(0.945 0.03 27)", fg: "oklch(0.543 0.174 29.7)", bd: "oklch(0.543 0.174 29.7 / 0.4)", dot: "oklch(0.543 0.174 29.7)" },
  neutral: { bg: "oklch(0.945 0.009 232.4)", fg: "oklch(0.541 0.038 234.7)", bd: "oklch(0.907 0.014 233.8)", dot: "oklch(0.541 0.038 234.7)" },
} as const;
type Tom = keyof typeof T;

const STATUS_TOM: Record<StatusDemanda, Tom> = { "Pendente Lawi": "amber", "Aguardando Cliente/3º": "neutral", Respondido: "teal", Finalizado: "neutral" };

function DashboardPage() {
  const ativas = DEMANDAS.filter((d) => d.status !== "Finalizado");

  // --- SLA (48h) — aplicável às tarefas com data de recebimento (one-shot) ---
  const comSla = ativas
    .map((d) => ({ d, sla: slaInfo(d.recebidoEm) }))
    .filter((x) => x.sla) as { d: (typeof ativas)[number]; sla: NonNullable<ReturnType<typeof slaInfo>> }[];
  const slaEstourado = comSla.filter((x) => x.sla.estourado).length;
  const slaDentro = comSla.length - slaEstourado;

  // --- Prazos (todas as tarefas ativas, ordenadas por urgência) ---
  const radar = ativas
    .map((d) => ({ d, dias: diasRestantes(d.prazoFatal) }))
    .sort((a, b) => a.dias - b.dias);
  const vencendo = radar.filter((r) => r.dias <= 2).length;
  const vencidas = radar.filter((r) => r.dias < 0).length;

  // --- Distribuição por tipo de tarefa ---
  const porTipo = TIPOS_TAREFA.map((t) => ({ ...t, n: ativas.filter((d) => d.tipoTarefa === t.chave).length }));
  const maxTipo = Math.max(1, ...porTipo.map((t) => t.n));

  // --- Distribuição por status ---
  const STATUS_ORD: StatusDemanda[] = ["Pendente Lawi", "Aguardando Cliente/3º", "Respondido"];
  const porStatus = STATUS_ORD.map((s) => ({ s, n: ativas.filter((d) => d.status === s).length }));
  const maxStatus = Math.max(1, ...porStatus.map((s) => s.n));

  // --- Faturamento mix (por cliente da tarefa) ---
  const mix = (["retainer", "por_tarefa"] as Faturamento[]).map((f) => ({
    f,
    n: ativas.filter((d) => faturamentoDe(nomeCliente(d.clienteId)) === f).length,
  }));

  // --- Carga por cliente ---
  const carga = CLIENTES.map((c) => {
    const tarefas = ativas.filter((d) => d.clienteId === c.id).length;
    const pct = Math.min(100, Math.round((c.horasUsadas / c.horasContratadas) * 100));
    return { c, tarefas, pct, excedido: c.horasUsadas > c.horasContratadas, fat: faturamentoDe(c.nome) };
  }).sort((a, b) => b.tarefas - a.tarefas);

  const horasUsadas = CLIENTES.reduce((s, c) => s + c.horasUsadas, 0);
  const horasContratadas = CLIENTES.reduce((s, c) => s + c.horasContratadas, 0);

  // --- Recomendações derivadas (sem números inventados) ---
  const recs: { tom: Tom; txt: string }[] = [];
  if (slaEstourado > 0) recs.push({ tom: "danger", txt: `${slaEstourado} tarefa(s) one-shot fora do SLA de 48h — priorizar retorno hoje.` });
  if (vencidas > 0) recs.push({ tom: "danger", txt: `${vencidas} prazo(s) já vencido(s) — risco em resposta administrativa.` });
  carga.filter((x) => x.pct >= 80).forEach((x) => recs.push({ tom: x.excedido ? "danger" : "amber", txt: `${x.c.nome} em ${x.pct}% das horas contratadas${x.excedido ? " (excedido)" : ""} — avaliar escopo/retainer.` }));
  if (recs.length === 0) recs.push({ tom: "teal", txt: "Sem alertas críticos — operação dentro dos prazos." });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Visão de gestão · Legal Department · {ativas.length} tarefas ativas</p>
          </div>
          <Link to="/" className="text-[13px] font-medium text-muted-foreground hover:text-teal">Ir para as tarefas →</Link>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={Layers} tom="teal" valor={String(ativas.length)} rotulo="Tarefas ativas" nota={`${porTipo[0].n} Procon · ${porTipo[1].n} one-shot`} />
          <Kpi icon={CheckCircle2} tom={slaEstourado > 0 ? "danger" : "teal"} valor={`${slaDentro}/${comSla.length}`} rotulo="One-Shot no SLA (48h)" nota={slaEstourado > 0 ? `${slaEstourado} fora do prazo` : "todas dentro do prazo"} />
          <Kpi icon={AlarmClock} tom={vencendo > 0 ? "amber" : "neutral"} valor={String(vencendo)} rotulo="Prazos ≤ 2 dias" nota={vencidas > 0 ? `${vencidas} já vencido(s)` : "nenhum vencido"} />
          <Kpi icon={Clock} tom={horasUsadas > horasContratadas ? "danger" : "teal"} valor={`${horasUsadas.toFixed(1)}h`} rotulo="Horas do mês" nota={`de ${horasContratadas}h contratadas`} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
          {/* SLA one-shot */}
          <Painel titulo="SLA Lawi · one-shot (48h)" icone={CheckCircle2}>
            {comSla.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Nenhuma tarefa com SLA em andamento.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {comSla
                  .sort((a, b) => a.sla.horas - b.sla.horas)
                  .map(({ d, sla }) => {
                    const tom: Tom = sla.estourado ? "danger" : sla.horas <= 24 ? "amber" : "teal";
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">{d.titulo}</p>
                          <p className="text-[11px] text-muted-foreground">{nomeCliente(d.clienteId)} · recebido {formatarData(d.recebidoEm!)}</p>
                        </div>
                        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: T[tom].bg, color: T[tom].fg, border: `1px solid ${T[tom].bd}` }}>
                          {sla.estourado ? `${Math.abs(sla.horas)}h atrasado` : `${sla.horas}h restantes`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Painel>

          {/* Radar de prazos */}
          <Painel titulo="Radar de prazos" icone={AlarmClock}>
            <div className="flex flex-col divide-y divide-border">
              {radar.slice(0, 6).map(({ d, dias }) => {
                const tom: Tom = dias < 0 ? "danger" : dias <= 2 ? "amber" : "neutral";
                return (
                  <div key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-foreground">{d.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{nomeCliente(d.clienteId)} · {formatarData(d.prazoFatal)}</p>
                    </div>
                    <span className="shrink-0 text-[12px] font-semibold" style={{ color: T[tom].fg }}>
                      {dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? "hoje" : `em ${dias}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </Painel>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Por tipo */}
          <Painel titulo="Por tipo de tarefa" icone={Layers}>
            <div className="flex flex-col gap-3">
              {porTipo.map((t) => (
                <Barra key={t.chave} label={t.label} valor={t.n} max={maxTipo} tom={t.chave === "acompanhamento_procon" ? "teal" : "amber"} />
              ))}
            </div>
          </Painel>
          {/* Por status */}
          <Painel titulo="Por status" icone={TrendingUp}>
            <div className="flex flex-col gap-3">
              {porStatus.map((s) => (
                <Barra key={s.s} label={s.s} valor={s.n} max={maxStatus} tom={STATUS_TOM[s.s]} />
              ))}
            </div>
          </Painel>
          {/* Faturamento */}
          <Painel titulo="Faturamento (tarefas ativas)" icone={TrendingUp}>
            <div className="flex flex-col gap-3">
              {mix.map((m) => (
                <Barra key={m.f} label={FATURAMENTO_LABEL[m.f]} valor={m.n} max={Math.max(1, ...mix.map((x) => x.n))} tom={m.f === "retainer" ? "teal" : "neutral"} />
              ))}
            </div>
          </Painel>
        </div>

        {/* Carga por cliente */}
        <Painel titulo="Carga por cliente" icone={Users} className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Faturamento</th>
                  <th className="pb-2 text-center">Tarefas ativas</th>
                  <th className="pb-2">Horas do mês</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {carga.map(({ c, tarefas, pct, excedido, fat }) => (
                  <tr key={c.id}>
                    <td className="py-2.5">
                      <Link to="/clientes/$clienteId" params={{ clienteId: c.id }} className="font-medium text-foreground hover:text-teal">{c.nome}</Link>
                      <p className="text-[11px] text-muted-foreground">{c.segmento}</p>
                    </td>
                    <td className="py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: T[fat === "retainer" ? "teal" : "neutral"].bg, color: T[fat === "retainer" ? "teal" : "neutral"].fg }}>{FATURAMENTO_LABEL[fat]}</span>
                    </td>
                    <td className="py-2.5 text-center font-semibold text-foreground">{tarefas}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full" style={{ width: `${pct}%`, background: excedido ? T.danger.dot : T.teal.dot }} />
                        </div>
                        <span className={excedido ? "text-danger" : "text-muted-foreground"}>{c.horasUsadas.toFixed(1)}h / {c.horasContratadas}h</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>

        {/* Recomendações */}
        <Painel titulo="Recomendações" icone={AlertTriangle} className="mt-4">
          <ul className="flex flex-col gap-2">
            {recs.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: T[r.tom].dot }} />
                <span className="text-foreground">{r.txt}</span>
              </li>
            ))}
          </ul>
        </Painel>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Dados vivos das tarefas registradas (seed do Notion Tracking Global). Horas por cliente virão do tracking (Lawrita/WhatsApp ou manual); integração financeira migrará para o Odoo.
        </p>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, tom, valor, rotulo, nota }: { icon: typeof Layers; tom: Tom; valor: string; rotulo: string; nota: string }) {
  return (
    <div className="card-surface p-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: T[tom].bg, color: T[tom].fg }}><Icon className="h-4 w-4" /></span>
      <p className="mt-3 text-2xl font-semibold text-foreground">{valor}</p>
      <p className="text-[13px] font-medium text-foreground">{rotulo}</p>
      <p className="text-[11px] text-muted-foreground">{nota}</p>
    </div>
  );
}

function Painel({ titulo, icone: Icone, children, className = "" }: { titulo: string; icone: typeof Layers; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-surface p-5 ${className}`}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Icone className="h-4 w-4 text-muted-foreground" /> {titulo}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Barra({ label, valor, max, tom }: { label: string; valor: number; max: number; tom: Tom }) {
  const pct = Math.round((valor / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-foreground">{label}</span>
        <span className="font-semibold text-foreground">{valor}</span>
      </div>
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, pct)}%`, background: T[tom].dot }} />
      </div>
    </div>
  );
}
