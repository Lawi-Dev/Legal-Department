import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, Circle, Clock, Copy, Download, Dot, ExternalLink,
  FileText, Loader2, Mail, Pencil, Plus, Radar, Search, TimerReset, Upload, X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  ADVOGADOS, CLIENTES, DEMANDAS, FATURAMENTO_LABEL, HOJE, STATUS, TIPOS_TAREFA,
  clientePorId, diasRestantes, faturamentoDe, formatarData,
  type Demanda, type Estagio, type StatusDemanda, type TipoTarefa,
} from "@/lib/legal-data";
import { RASCUNHOS, anexoDe, gerarSaida, type TipoRascunho } from "@/lib/templates";
import { demandaDeProcon, extrairPdfProcon, type ProconExtraido } from "@/lib/procon-pdf";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Casos — Legal Department | Lawi Hub" }] }),
  component: Casos,
});

type Tom = "teal" | "amber" | "danger" | "neutral";
const TONS: Record<Tom, { bg: string; fg: string; bd: string; dot: string }> = {
  teal: { bg: "oklch(0.964 0.018 196.9)", fg: "oklch(0.268 0.05 231.2)", bd: "oklch(0.732 0.117 194.9 / 0.4)", dot: "oklch(0.732 0.117 194.9)" },
  amber: { bg: "oklch(0.962 0.058 95.6)", fg: "oklch(0.408 0.116 38.2)", bd: "oklch(0.769 0.165 70.1 / 0.4)", dot: "oklch(0.769 0.165 70.1)" },
  danger: { bg: "oklch(0.945 0.03 27)", fg: "oklch(0.543 0.174 29.7)", bd: "oklch(0.543 0.174 29.7 / 0.4)", dot: "oklch(0.543 0.174 29.7)" },
  neutral: { bg: "oklch(0.945 0.009 232.4)", fg: "oklch(0.541 0.038 234.7)", bd: "oklch(0.907 0.014 233.8)", dot: "oklch(0.541 0.038 234.7)" },
};
const STATUS_TOM: Record<StatusDemanda, Tom> = { "Pendente Lawi": "amber", "Aguardando Cliente/3º": "neutral", Respondido: "teal", Finalizado: "neutral" };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const EU = "Verber Souza";
const TIPO_ESTAGIO: Record<Estagio["tipo"], { label: string; tom: Tom; lawi: boolean }> = {
  registra: { label: "auto", tom: "neutral", lawi: true },
  ia: { label: "IA", tom: "teal", lawi: true },
  manual: { label: "você", tom: "amber", lawi: true },
  cliente: { label: "cliente", tom: "neutral", lawi: false },
};

const hm = (min: number) => (!min ? "—" : Math.floor(min / 60) ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}` : `${min}min`);
const iniciais = (n: string) => n.split(" ").map((p) => p[0]).slice(0, 2).join("");
const tomPrazo = (d: number): Tom => (d < 0 ? "danger" : d <= 7 ? "amber" : "neutral");

type Extra = { data: string; advogado: string; descricao: string; minutos: number; visivelCliente: boolean };
type EstOv = Record<string, { done?: boolean; min?: string }>;

function Casos() {
  const [tipoFiltro, setTipoFiltro] = useState<TipoTarefa>("acompanhamento_procon");
  const [fatFiltro, setFatFiltro] = useState<"todos" | "retainer" | "por_tarefa">("todos");
  const [view, setView] = useState<"urgencia" | "tabela" | "kanban">("urgencia");
  const [cliente, setCliente] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [resp, setResp] = useState("todos");
  const [prazo, setPrazo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [radarAberto, setRadarAberto] = useState(false);
  const [extras, setExtras] = useState<Record<string, Extra[]>>({});
  const [statusOverride, setStatusOverride] = useState<Record<string, StatusDemanda>>({});
  const [prazoOverride, setPrazoOverride] = useState<Record<string, string>>({});
  const [estState, setEstState] = useState<Record<string, EstOv>>({});
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novosMinutos, setNovosMinutos] = useState("30");
  const [visivelCliente, setVisivelCliente] = useState(true);
  const [casosExtra, setCasosExtra] = useState<Demanda[]>([]);
  const [importado, setImportado] = useState<ProconExtraido | null>(null);
  const [importando, setImportando] = useState(false);
  const [erroImport, setErroImport] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportando(true);
    setErroImport("");
    try {
      setImportado(await extrairPdfProcon(file));
    } catch (err) {
      setErroImport(err instanceof Error ? err.message : "Falha ao ler o PDF.");
    } finally {
      setImportando(false);
    }
  }
  function criarCasoImportado() {
    if (!importado) return;
    const nova = demandaDeProcon(importado);
    setCasosExtra((prev) => [nova, ...prev]);
    setImportado(null);
    setSel(nova.id);
  }
  const campoImp = (k: keyof ProconExtraido, label: string, type = "text") => (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input type={type} value={(importado?.[k] as string) ?? ""} onChange={(e) => setImportado((p) => (p ? { ...p, [k]: e.target.value } : p))} className="h-9 rounded-[10px] border border-border bg-card px-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );

  function enriquecer(d: Demanda) {
    const st = statusOverride[d.id] ?? d.status;
    const prazoISO = prazoOverride[d.id] ?? d.prazoFatal;
    const dias = diasRestantes(prazoISO);
    const conta = st === "Pendente Lawi" || st === "Aguardando Cliente/3º";
    const tom = conta ? TONS[tomPrazo(dias)] : TONS.neutral;
    const stTom = TONS[STATUS_TOM[st]];
    const atividades = [...d.atividades, ...(extras[d.id] ?? [])];
    const ov = estState[d.id] ?? {};
    const minEst = (d.estagios ?? []).reduce((s, e) => s + (parseInt(ov[e.chave]?.min ?? "", 10) || 0), 0);
    const minutos = atividades.reduce((s, a) => s + a.minutos, 0) + minEst;
    const sufixo = !conta ? "" : dias < 0 ? `vencido há ${Math.abs(dias)}d` : dias === 0 ? "hoje" : `em ${dias}d`;
    const cl = clientePorId(d.clienteId);
    const fat = faturamentoDe(cl?.nome ?? d.clienteId);
    return {
      raw: d, id: d.id, titulo: d.titulo, tipo: d.tipo, status: st, dias, conta, tipoTarefa: d.tipoTarefa,
      faturamento: fat, faturamentoLabel: FATURAMENTO_LABEL[fat],
      cliente: cl?.nome ?? d.clienteId, resp: d.responsavel, iniciais: iniciais(d.responsavel),
      prazoISO, prazoTxt: formatarData(prazoISO), prazoGerencial: formatarData(d.prazoGerencial), aviso: d.avisoDiasAntes, sufixo,
      prazoBg: tom.bg, prazoFg: tom.fg, prazoBd: tom.bd, statusBg: stTom.bg, statusFg: stTom.fg, statusBd: stTom.bd,
      barra: conta ? `${Math.max(4, Math.min(100, Math.round(((21 - Math.min(21, Math.max(0, dias))) / 21) * 100)))}%` : "",
      horas: hm(minutos), descricao: d.descricao, links: d.links, processo: d.processo,
      sub: d.processo ? `${d.processo.orgao} · ${d.processo.numero}` : d.tipo,
      atividades: atividades.map((a) => ({
        data: formatarData(a.data).slice(0, 5), descricao: a.descricao, advogado: a.advogado, minutos: a.minutos,
        tag: a.visivelCliente ? "visível ao cliente" : "interno",
        tagBg: a.visivelCliente ? TONS.teal.bg : TONS.neutral.bg, tagFg: a.visivelCliente ? TONS.teal.fg : TONS.neutral.fg,
      })),
    };
  }
  type Enriq = ReturnType<typeof enriquecer>;

  const todas = useMemo(() => [...casosExtra, ...DEMANDAS].map(enriquecer).sort((a, b) => a.dias - b.dias), [casosExtra, extras, statusOverride, prazoOverride, estState]); // eslint-disable-line react-hooks/exhaustive-deps
  const daArea = todas.filter((d) => d.tipoTarefa === tipoFiltro);
  const clientesArea = CLIENTES;

  const lista = useMemo(() => {
    const q = busca.toLowerCase();
    return daArea.filter((d) => {
      if (cliente !== "todos" && d.raw.clienteId !== cliente) return false;
      if (fatFiltro !== "todos" && d.faturamento !== fatFiltro) return false;
      if (status !== "todos" && d.status !== status) return false;
      if (resp !== "todos" && d.resp !== resp) return false;
      if (prazo === "vencido" && !(d.conta && d.dias < 0)) return false;
      if (prazo === "7dias" && !(d.conta && d.dias >= 0 && d.dias <= 7)) return false;
      if (q && !`${d.titulo} ${d.id} ${d.cliente} ${d.processo?.numero ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [daArea, cliente, fatFiltro, status, resp, prazo, busca]);

  const emRisco = daArea.filter((d) => d.conta);
  const vencidos = emRisco.filter((d) => d.dias < 0);
  const criticos = emRisco.filter((d) => d.dias >= 0 && d.dias <= 7);
  const abertas = daArea.filter((d) => d.status !== "Finalizado");

  const gruposUrg = [
    { key: "vencido", label: "Prazo vencido", cor: TONS.danger.dot, corTexto: TONS.danger.fg, bg: "oklch(0.945 0.03 27 / 0.45)", nota: "resposta administrativa em risco — priorizar", filtro: (d: Enriq) => d.conta && d.dias < 0 },
    { key: "amber", label: "Vencem em até 7 dias", cor: TONS.amber.dot, corTexto: TONS.amber.fg, bg: "oklch(0.962 0.058 95.6 / 0.6)", nota: "alerta por e-mail já disparado", filtro: (d: Enriq) => d.conta && d.dias >= 0 && d.dias <= 7 },
    { key: "noprazo", label: "No prazo", cor: TONS.teal.dot, corTexto: "oklch(0.339 0.065 237.2)", bg: "oklch(0.964 0.018 196.9 / 0.5)", nota: "acompanhamento normal", filtro: (d: Enriq) => d.conta && d.dias > 7 },
    { key: "respondido", label: "Respondidos · aguardando desfecho", cor: TONS.neutral.dot, corTexto: TONS.neutral.fg, bg: "oklch(0.945 0.009 232.4 / 0.5)", nota: "resposta protocolada", filtro: (d: Enriq) => d.status === "Respondido" },
    { key: "fim", label: "Concluídos", cor: TONS.neutral.dot, corTexto: TONS.neutral.fg, bg: "oklch(0.945 0.009 232.4 / 0.5)", nota: "encerrados", filtro: (d: Enriq) => d.status === "Finalizado" },
  ];
  const grupos =
    view === "tabela"
      ? [{ key: "todas", label: "Todas as demandas", cor: TONS.teal.dot, corTexto: "oklch(0.339 0.065 237.2)", bg: "oklch(0.978 0.003 247.9)", nota: "ordenadas pelo prazo", itens: lista }]
      : gruposUrg.map((g) => ({ ...g, itens: lista.filter(g.filtro) })).filter((g) => g.itens.length > 0);

  const colunas = STATUS.map((st) => ({ label: st, cor: TONS[STATUS_TOM[st]].dot, itens: lista.filter((d) => d.status === st) }));

  const radar = emRisco.filter((d) => d.dias <= 21).slice(0, 7).map((d) => {
    const p = d.prazoISO.split("-");
    return { ...d, dia: p[2], mes: MESES[parseInt(p[1], 10) - 1] };
  });
  const horasClientes = clientesArea.map((c) => {
    const pct = c.horasUsadas / c.horasContratadas;
    const cor = pct >= 1 ? TONS.danger.dot : pct >= 0.8 ? TONS.amber.dot : TONS.teal.dot;
    return { nome: c.nome, texto: `${c.horasUsadas}h / ${c.horasContratadas}h`, pct: `${Math.min(100, Math.round(pct * 100))}%`, cor };
  });
  const cargaAdvogados = ADVOGADOS.map((a) => {
    const meus = abertas.filter((d) => d.resp === a);
    const crit = meus.filter((d) => d.conta && d.dias <= 7).length;
    return { nome: a, iniciais: iniciais(a), abertos: meus.length, criticos: crit ? `${crit} críticos` : "ok", cor: crit ? TONS.danger.fg : TONS.teal.fg };
  }).filter((a) => a.abertos > 0);

  const selD = todas.find((d) => d.id === sel) ?? null;

  function lancarHoras() {
    const min = parseInt(novosMinutos, 10);
    if (!sel || !min || !novaDescricao.trim()) return;
    setExtras((prev) => ({ ...prev, [sel]: [...(prev[sel] ?? []), { data: "2026-08-18", advogado: EU, descricao: novaDescricao.trim(), minutos: min, visivelCliente }] }));
    setNovaDescricao("");
    setNovosMinutos("30");
  }
  const mudarStatus = (novo: StatusDemanda) => sel && setStatusOverride((prev) => ({ ...prev, [sel]: novo }));
  const mudarPrazo = (iso: string) => sel && iso && setPrazoOverride((prev) => ({ ...prev, [sel]: iso }));
  const setEst = (chave: string, patch: { done?: boolean; min?: string }) =>
    sel && setEstState((prev) => ({ ...prev, [sel]: { ...prev[sel], [chave]: { ...prev[sel]?.[chave], ...patch } } }));

  const selectStyle = "h-[34px] rounded-[10px] border border-border bg-card px-2.5 text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring";

  // ---- página inteira do caso ----
  if (selD) {
    const props = {
      d: selD, estOv: estState[selD.id] ?? {}, onClose: () => setSel(null), onPrazo: mudarPrazo, setEst,
      novaDescricao, setNovaDescricao, novosMinutos, setNovosMinutos, visivelCliente, setVisivelCliente, lancarHoras, mudarStatus,
    };
    return (
      <AppShell>
        {selD.raw.tipoTarefa === "one_shot"
          ? <OneShotDetalhe key={selD.id} {...props} />
          : <CasoDetalhe key={selD.id} {...props} />}
      </AppShell>
    );
  }

  return (
    <AppShell>
      <style>{`.ldrow:hover{background:oklch(0.964 0.018 196.9 / 0.6)!important}.ldcard:hover{box-shadow:0 8px 24px -12px rgb(13 60 85 / 0.35)}.ldradar:hover{border-color:oklch(0.732 0.117 194.9);background:oklch(0.964 0.018 196.9 / 0.5)}.ldarea:hover{background:oklch(0.945 0.009 232.4 / 0.6)}`}</style>
      <div className="mx-auto max-w-[1400px]">
        <div className="flex w-full gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-card">
          {TIPOS_TAREFA.map((t) => {
            const ativo = tipoFiltro === t.chave;
            const n = todas.filter((d) => d.tipoTarefa === t.chave && d.status !== "Finalizado").length;
            const desc = t.chave === "acompanhamento_procon" ? "Extrajudicial · prazo administrativo" : "Tarefa pontual · SLA 48h";
            return (
              <button key={t.chave} type="button" onClick={() => { setTipoFiltro(t.chave); setPrazo("todos"); setCliente("todos"); }} className={`flex flex-1 flex-col items-center rounded-xl px-4 py-3 text-center transition-colors ${ativo ? "" : "ldarea"}`} style={ativo ? { background: TONS.teal.bg } : {}}>
                <span className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: ativo ? TONS.teal.fg : "oklch(0.339 0.065 237.2)" }}>{t.label}<span className="rounded-full px-2 py-px text-[11px] font-bold" style={{ background: ativo ? "#fff" : "oklch(0.945 0.009 232.4)", color: ativo ? TONS.teal.fg : "oklch(0.541 0.038 234.7)" }}>{n}</span></span>
                <span className="text-[11px] text-muted-foreground">{desc}</span>
              </button>
            );
          })}
        </div>

        {vencidos.length > 0 && (
          <button type="button" onClick={() => { setPrazo("vencido"); setView("urgencia"); }} className="mt-4 flex w-full items-center gap-3.5 rounded-xl bg-card px-4 py-3 text-left" style={{ border: "1.5px solid oklch(0.543 0.174 29.7 / 0.55)" }}>
            <AlertTriangle className="h-[18px] w-[18px] shrink-0" style={{ color: TONS.danger.dot }} />
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold" style={{ color: TONS.danger.fg }}>{vencidos.length === 1 ? "1 caso com prazo de resposta vencido" : `${vencidos.length} casos com prazo de resposta vencido`}</p><p className="mt-0.5 truncate text-[13px] text-muted-foreground">{vencidos[0] && `${vencidos[0].cliente} · ${vencidos[0].titulo} — vencido há ${Math.abs(vencidos[0].dias)} dias`}</p></div>
            <span className="text-xs font-semibold" style={{ color: TONS.danger.fg }}>Ver →</span>
          </button>
        )}

        <div className="card-surface mt-4 flex flex-wrap items-center gap-2 p-2.5">
          <div className="flex rounded-xl bg-secondary p-[3px]">
            {(["urgencia", "tabela", "kanban"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className="h-[30px] rounded-[9px] px-3.5 text-[13px]" style={view === v ? { background: "#fff", boxShadow: "0 1px 2px rgb(13 60 85 / 0.12)", fontWeight: 600, color: "oklch(0.339 0.065 237.2)" } : { fontWeight: 500, color: "oklch(0.541 0.038 234.7)" }}>{v === "urgencia" ? "Urgência" : v === "tabela" ? "Tabela" : "Kanban"}</button>
            ))}
          </div>
          <div className="h-6 w-px bg-border" />
          <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={selectStyle}><option value="todos">Cliente: todos</option>{clientesArea.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectStyle}><option value="todos">Status: todos</option>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <select value={resp} onChange={(e) => setResp(e.target.value)} className={selectStyle}><option value="todos">Responsável: todos</option>{ADVOGADOS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          <select value={fatFiltro} onChange={(e) => setFatFiltro(e.target.value as typeof fatFiltro)} className={selectStyle}><option value="todos">Faturamento: todos</option><option value="retainer">Retainer</option><option value="por_tarefa">Por tarefa</option></select>
          <button type="button" onClick={() => setRadarAberto((v) => !v)} className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border px-3 text-[13px]" style={radarAberto ? { borderColor: "oklch(0.732 0.117 194.9)", background: TONS.teal.bg, color: TONS.teal.fg } : { borderColor: "oklch(0.907 0.014 233.8)", color: "oklch(0.541 0.038 234.7)" }}><Radar className="h-3.5 w-3.5" /> Radar de prazos</button>
          <div className="relative ml-auto flex items-center gap-2">
            <div className="relative min-w-[220px]"><Search className="absolute top-[10px] left-3 h-[15px] w-[15px] text-muted-foreground" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar caso, cliente ou protocolo" className="h-[34px] w-full rounded-[10px] border border-border bg-card pr-3 pl-[34px] text-[13px] text-foreground outline-none focus:ring-2 focus:ring-ring" /></div>
            <button type="button" title="Exportar espelho" className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-[13px] font-medium text-foreground hover:bg-secondary"><Download className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-semibold" style={{ borderColor: "oklch(0.732 0.117 194.9 / 0.5)", background: TONS.teal.bg, color: TONS.teal.fg }}><Upload className="h-3.5 w-3.5" /> Importar PDF do Procon</button>
            <button type="button" className="btn-teal inline-flex h-[34px] shrink-0 items-center gap-1.5 px-3.5 text-[13px]"><Plus className="h-4 w-4" /> Novo caso</button>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPdf} />
          </div>
        </div>

        <div className="mt-3.5 flex gap-4">
          <div className="min-w-0 flex-1">
            {daArea.length === 0 ? (
              <div className="card-surface p-14 text-center"><p className="text-sm font-medium text-foreground">Nenhuma tarefa {tipoFiltro === "one_shot" ? "One-Shot" : tipoFiltro === "acompanhamento_procon" ? "de Acompanhamento Procon" : ""} ainda.</p><p className="mt-1 text-[13px] text-muted-foreground">Importe um PDF do Procon ou registre uma nova tarefa.</p></div>
            ) : view !== "kanban" ? (
              <div className="card-surface overflow-x-auto p-0">
                <div className="grid min-w-[720px] items-center border-b border-border bg-background px-3.5 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase" style={{ gridTemplateColumns: "96px minmax(150px,1fr) 150px 150px 34px 86px" }}>
                  <span>Cliente</span><span>Caso · órgão · protocolo</span><span>Status</span><span>Prazo resposta ↑</span><span>Resp.</span><span className="text-right">Ações</span>
                </div>
                {grupos.map((g) => (
                  <div key={g.key}>
                    <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2" style={{ background: g.bg }}><span className="h-2 w-2 rounded-full" style={{ background: g.cor }} /><span className="text-xs font-bold tracking-wide uppercase" style={{ color: g.corTexto }}>{g.label}</span><span className="text-xs text-muted-foreground">{g.itens.length}</span><span className="ml-auto text-xs text-muted-foreground">{"nota" in g ? g.nota : ""}</span></div>
                    {g.itens.map((d) => (
                      <div key={d.id} onClick={() => setSel(d.id)} className="ldrow grid min-w-[720px] cursor-pointer items-center bg-card px-3.5 py-2.5" style={{ gridTemplateColumns: "96px minmax(150px,1fr) 150px 150px 34px 86px", borderBottom: "1px solid oklch(0.907 0.014 233.8 / 0.7)" }}>
                        <span className="flex min-w-0 flex-col gap-0.5 pr-2"><span className="truncate text-[13px] font-medium">{d.cliente}</span><span className="truncate text-[10px] text-muted-foreground">{d.faturamentoLabel}</span></span>
                        <span className="flex min-w-0 flex-col gap-0.5 pr-3"><span className="truncate text-[13px] font-medium">{d.titulo}</span><span className="truncate text-[11px] text-muted-foreground">{d.sub} · {d.horas}</span></span>
                        <span><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ border: `1px solid ${d.statusBd}`, background: d.statusBg, color: d.statusFg }}>{d.status}</span></span>
                        <span className="flex flex-col gap-1 pr-3.5"><span className="flex items-baseline gap-1.5 text-xs font-semibold" style={{ color: d.prazoFg }}>{d.prazoTxt}{d.sufixo && <span className="text-[11px] font-medium">{d.sufixo}</span>}</span>{d.conta && <span className="h-1 overflow-hidden rounded-full bg-secondary"><span className="block h-full" style={{ width: d.barra, background: d.prazoFg }} /></span>}</span>
                        <span title={d.resp} className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-secondary text-[10px] font-bold">{d.iniciais}</span>
                        <span className="flex justify-end gap-1">
                          <button type="button" title="Registrar horas" onClick={(e) => { e.stopPropagation(); setSel(d.id); }} className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-teal"><TimerReset className="h-3 w-3" /></button>
                          <a href={d.links.find((l) => l.label.includes("e-mail"))?.url ?? "#"} title="E-mail" onClick={(e) => e.stopPropagation()} className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-teal"><Mail className="h-3 w-3" /></a>
                          <a href={d.links.find((l) => l.label.includes("Drive"))?.url ?? "#"} title="Drive" onClick={(e) => e.stopPropagation()} className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-teal"><ExternalLink className="h-3 w-3" /></a>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {lista.length === 0 && <div className="p-11 text-center text-[13px] text-muted-foreground">Nenhum caso com esses filtros.</div>}
              </div>
            ) : (
              <div className="grid grid-cols-2 items-start gap-3 xl:grid-cols-4">
                {colunas.map((col) => (
                  <div key={col.label} className="flex flex-col gap-2.5 rounded-xl border border-border p-3" style={{ background: "oklch(0.945 0.009 232.4 / 0.55)" }}>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: col.cor }} /><span className="text-xs font-bold tracking-wide uppercase">{col.label}</span><span className="ml-auto rounded-full border border-border bg-card px-2 py-px text-[11px] font-semibold text-muted-foreground">{col.itens.length}</span></div>
                    {col.itens.map((d) => (
                      <div key={d.id} onClick={() => setSel(d.id)} className="ldcard flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-3" style={{ borderLeft: `3px solid ${d.prazoFg}` }}>
                        <span className="flex flex-wrap items-center justify-between gap-1"><span className="text-xs font-semibold text-teal">{d.cliente}</span><span className="text-[11px] text-muted-foreground">{d.processo?.orgao}</span></span>
                        <span className="text-[13px] leading-snug font-medium">{d.titulo}</span>
                        <span className="flex flex-wrap items-center justify-between gap-1.5 border-t pt-2" style={{ borderColor: "oklch(0.907 0.014 233.8 / 0.8)" }}><span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: d.prazoBg, color: d.prazoFg }}>{d.prazoTxt}{d.sufixo && ` · ${d.sufixo}`}</span><span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">{d.horas}<span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-secondary text-[10px] font-bold">{d.iniciais}</span></span></span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          {radarAberto && <RadarPanel radar={radar} horasClientes={horasClientes} cargaAdvogados={cargaAdvogados} onClose={() => setRadarAberto(false)} onOpen={setSel} />}
        </div>
      </div>

      {importando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4" style={{ boxShadow: "0 24px 48px -12px rgb(13 60 85 / 0.4)" }}><Loader2 className="h-5 w-5 animate-spin text-teal" /><span className="text-sm font-medium">Lendo o PDF do Procon…</span></div>
        </div>
      )}

      {erroImport && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm" style={{ borderColor: "oklch(0.543 0.174 29.7 / 0.4)", background: "oklch(0.945 0.03 27)", color: TONS.danger.fg }}>{erroImport}<button type="button" onClick={() => setErroImport("")} className="font-bold">✕</button></div>
      )}

      {importado && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setImportado(null)}>
          <div className="my-4 flex w-full max-w-2xl flex-col rounded-2xl border border-border bg-card" style={{ boxShadow: "0 24px 48px -12px rgb(13 60 85 / 0.4)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div><span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Importado do Portal Procon (sem IA)</span><h3 className="mt-0.5 text-base font-semibold">Revisar dados extraídos</h3></div>
              <button type="button" onClick={() => setImportado(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {campoImp("orgao", "Órgão")}
              {campoImp("protocolo", "Protocolo")}
              {campoImp("prazo", "Prazo de resposta", "date")}
              {campoImp("dataSolicitacao", "Data da solicitação")}
              {campoImp("consumidorNome", "Consumidor")}
              {campoImp("cpf", "CPF")}
              {campoImp("email", "E-mail")}
              {campoImp("cidade", "Cidade")}
              {campoImp("servico", "Serviço / curso")}
              {campoImp("valor", "Valor")}
              {campoImp("parcelas", "Parcelas")}
              {campoImp("dataContratacao", "Data da contratação")}
              <label className="col-span-2 flex flex-col gap-1"><span className="text-[11px] text-muted-foreground">Pedido do consumidor</span><input value={importado.pedido} onChange={(e) => setImportado((p) => (p ? { ...p, pedido: e.target.value } : p))} className="h-9 rounded-[10px] border border-border bg-card px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-ring" /></label>
              <label className="col-span-2 flex flex-col gap-1"><span className="text-[11px] text-muted-foreground">Reclamação (detalhes)</span><textarea value={importado.reclamacao} onChange={(e) => setImportado((p) => (p ? { ...p, reclamacao: e.target.value } : p))} rows={3} className="rounded-[10px] border border-border bg-card px-2.5 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring" /></label>
            </div>
            <details className="border-t border-border px-4 py-2">
              <summary className="cursor-pointer text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">🔍 Debug — linhas extraídas ({importado._linhas.length})</summary>
              <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-secondary/60 p-2 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">{importado._linhas.join("\n")}</pre>
            </details>
            <div className="flex items-center justify-between gap-2 border-t border-border p-3">
              <span className="text-[11px] text-muted-foreground">Revise/complete os campos antes de criar o caso.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setImportado(null)} className="h-9 rounded-xl border border-border bg-card px-4 text-[13px] font-medium">Cancelar</button>
                <button type="button" onClick={criarCasoImportado} className="btn-teal inline-flex h-9 items-center gap-1.5 px-4 text-[13px]"><Plus className="h-4 w-4" /> Criar caso</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ================= página inteira do caso ================= */
type Enq = { raw: Demanda; id: string; titulo: string; cliente: string; status: StatusDemanda; tipo: string; dias: number; conta: boolean; resp: string; horas: string; faturamentoLabel: string;
  prazoISO: string; prazoTxt: string; prazoGerencial: string; aviso: number; sufixo: string; prazoBg: string; prazoFg: string; prazoBd: string; statusBg: string; statusFg: string; statusBd: string;
  links: { label: string; url: string }[]; atividades: { data: string; descricao: string; advogado: string; minutos: number; tag: string; tagBg: string; tagFg: string }[] };

function AcessarProcon({ codigo }: { codigo?: string }) {
  const [copiado, setCopiado] = useState(false);
  const temCodigo = !!codigo && codigo !== "—";
  const copiar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!temCodigo) return;
    navigator.clipboard?.writeText(codigo!);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };
  return (
    <a href="https://fornecedor2.procon.sp.gov.br/" target="_blank" rel="noreferrer" className="flex flex-col justify-center gap-1 rounded-xl px-3.5 py-2 transition-[filter] hover:brightness-[0.97]" style={{ border: `1px solid ${TONS.teal.bd}`, background: TONS.teal.bg }}>
      <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase" style={{ color: TONS.teal.fg }}><ExternalLink className="h-3 w-3" /> Acessar Procon</span>
      {temCodigo ? (
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-[13px] font-semibold" style={{ color: TONS.teal.fg }}>{codigo}</span>
          <button type="button" onClick={copiar} title="Copiar código de acesso" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-teal">{copiado ? <Check className="h-3 w-3" style={{ color: TONS.teal.dot }} /> : <Copy className="h-3 w-3" />}</button>
        </span>
      ) : (
        <span className="text-[12px] text-muted-foreground">Portal do fornecedor</span>
      )}
    </a>
  );
}

function CasoDetalhe({
  d, estOv, onClose, onPrazo, setEst, novaDescricao, setNovaDescricao, novosMinutos, setNovosMinutos, visivelCliente, setVisivelCliente, lancarHoras, mudarStatus,
}: {
  d: Enq; estOv: EstOv; onClose: () => void; onPrazo: (iso: string) => void; setEst: (chave: string, patch: { done?: boolean; min?: string }) => void;
  novaDescricao: string; setNovaDescricao: (v: string) => void; novosMinutos: string; setNovosMinutos: (v: string) => void;
  visivelCliente: boolean; setVisivelCliente: (v: boolean) => void; lancarHoras: () => void; mudarStatus: (s: StatusDemanda) => void;
}) {
  const raw = d.raw;
  const p = raw.procon;
  const estagios = raw.estagios ?? [];
  const [rasc, setRasc] = useState<{ tipo: TipoRascunho; label: string } | null>(null);
  const [textoR, setTextoR] = useState("");
  const [copiadoR, setCopiadoR] = useState(false);
  const abrirRasc = (tipo: TipoRascunho, label: string) => { setRasc({ tipo, label }); setTextoR(gerarSaida(tipo, raw)); setCopiadoR(false); };
  const copiarRasc = () => { navigator.clipboard?.writeText(textoR); setCopiadoR(true); setTimeout(() => setCopiadoR(false), 1500); };
  return (
    <div className="mx-auto max-w-[1200px]">
      <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-teal"><ArrowLeft className="h-4 w-4" /> Voltar aos casos</button>

      <div className="card-surface mt-3 flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{d.cliente} · {raw.processo?.orgao ?? d.tipo} · {raw.processo?.numero}</span>
          <h1 className="mt-1 text-xl leading-snug font-semibold text-foreground">{d.titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ border: `1px solid ${d.statusBd}`, background: d.statusBg, color: d.statusFg }}>{d.status}</span>
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{d.tipo}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ border: `1px solid ${TONS.teal.bd}`, color: TONS.teal.fg }}>{d.faturamentoLabel}</span>
            <span className="text-xs text-muted-foreground">{d.horas} registradas</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-stretch gap-2">
            <AcessarProcon codigo={raw.processo?.codigoAcesso} />
            <div className="rounded-xl px-3.5 py-2 text-right" style={{ border: `1px solid ${d.prazoBd}`, background: d.prazoBg }}>
              <span className="flex items-center justify-end gap-1.5 text-[10px] font-bold tracking-wide uppercase" style={{ color: d.prazoFg }}><Clock className="h-3 w-3" /> Prazo de resposta</span>
              <span className="flex items-baseline justify-end gap-2"><span className="text-lg font-semibold" style={{ color: d.prazoFg }}>{d.prazoTxt}</span>{d.sufixo ? <span className="text-xs font-medium" style={{ color: d.prazoFg }}>{d.sufixo}</span> : <span className="text-xs text-muted-foreground">cumprido</span>}</span>
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Pencil className="h-3 w-3" /> Alterar prazo:<input type="date" value={d.prazoISO} onChange={(e) => onPrazo(e.target.value)} className="h-7 rounded-lg border border-border bg-card px-2 text-[12px] outline-none focus:ring-2 focus:ring-ring" /></label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* ---- linha do tempo de atribuição ---- */}
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Linha do tempo do caso</h2>
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase">
              <span className="flex items-center gap-1" style={{ color: TONS.teal.fg }}><span className="h-2 w-2 rounded-full" style={{ background: TONS.teal.dot }} /> Lawi</span>
              <span className="flex items-center gap-1 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: TONS.neutral.dot }} /> Cliente</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col">
            {estagios.map((e, i) => {
              const meta = TIPO_ESTAGIO[e.tipo];
              const done = estOv[e.chave]?.done ?? e.status === "concluido";
              const atual = !done && e.status === "atual";
              const last = i === estagios.length - 1;
              const lawi = meta.lawi;
              const card = (
                <div className={`flex flex-col gap-1.5 rounded-xl border p-3 ${lawi ? "" : "text-right"}`} style={{ borderColor: done ? "oklch(0.732 0.117 194.9 / 0.35)" : "oklch(0.907 0.014 233.8)", background: lawi ? "#fff" : "oklch(0.945 0.009 232.4 / 0.4)" }}>
                  <div className={`flex items-center gap-2 ${lawi ? "" : "flex-row-reverse"}`}>
                    <span className="text-[13px] font-medium" style={{ color: done ? "oklch(0.339 0.065 237.2)" : atual ? TONS.amber.fg : "oklch(0.339 0.065 237.2)" }}>{e.label}</span>
                    <span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ background: TONS[meta.tom].bg, color: TONS[meta.tom].fg }}>{meta.label}</span>
                    {e.data && <span className="text-[11px] text-muted-foreground">{formatarData(e.data)}</span>}
                  </div>
                  {e.nota && <span className="text-[11px] leading-snug" style={{ color: e.nota.startsWith("⚠") ? TONS.danger.fg : "oklch(0.541 0.038 234.7)" }}>{e.nota}</span>}
                  {lawi && (
                    <div className="mt-0.5 flex items-center gap-2">
                      <button type="button" onClick={() => setEst(e.chave, { done: !done })} className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: done ? TONS.teal.fg : "oklch(0.541 0.038 234.7)" }}>
                        {done ? <CheckCircle2 className="h-4 w-4" style={{ color: TONS.teal.dot }} /> : <Circle className="h-4 w-4" style={{ color: "oklch(0.8 0.01 233)" }} />} {done ? "Concluído" : "Marcar feito"}
                      </button>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground"><input type="number" min={0} placeholder="min" value={estOv[e.chave]?.min ?? ""} onChange={(ev) => setEst(e.chave, { min: ev.target.value })} className="h-7 w-[58px] rounded-lg border border-border bg-card px-1.5 text-[12px] outline-none focus:ring-2 focus:ring-ring" /> min</label>
                    </div>
                  )}
                </div>
              );
              return (
                <div key={e.chave} className="grid items-stretch gap-2" style={{ gridTemplateColumns: "1fr 24px 1fr" }}>
                  <div className="flex flex-col justify-center pb-4">{lawi ? card : null}</div>
                  <div className="relative flex flex-col items-center">
                    <span className="z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: done ? TONS.teal.dot : atual ? TONS.amber.dot : "oklch(0.93 0.008 233)" }}>
                      {done ? <CheckCircle2 className="h-4 w-4 text-white" /> : atual ? <Dot className="h-5 w-5 animate-pulse text-white" strokeWidth={6} /> : <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    {!last && <span className="w-px flex-1" style={{ background: done ? TONS.teal.dot : "oklch(0.907 0.014 233.8)" }} />}
                  </div>
                  <div className="flex flex-col justify-center pb-4">{!lawi ? card : null}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---- coluna direita ---- */}
        <div className="flex flex-col gap-4">
          <p className="card-surface p-4 text-[13px] leading-relaxed text-foreground">{raw.descricao}</p>

          {p && (
            <div className="card-surface flex flex-col gap-3 p-4">
              <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Reclamação · Portal Procon</span>
              <div className="grid grid-cols-2 gap-2.5">
                <Campo label="Protocolo" v={p.protocolo} mono /><Campo label="Tipo" v={p.tipoAtendimento} />
                <Campo label="Consumidor" v={p.consumidor.nome} />{p.consumidor.cpf && <Campo label="CPF" v={p.consumidor.cpf} mono />}
                <Campo label="Serviço" v={p.compra.servico} /><Campo label="Valor" v={p.compra.valor} />
                {p.compra.parcelas && <Campo label="Parcelas" v={p.compra.parcelas} />}{p.compra.dataContratacao && <Campo label="Contratação" v={p.compra.dataContratacao} />}
              </div>
              <div className="flex flex-col gap-1 border-t border-border pt-2.5"><span className="text-[11px] text-muted-foreground">Pedido do consumidor</span><span className="text-[13px]">{p.reclamacao.pedido}</span></div>
            </div>
          )}

          {raw.negociacao && (
            <div className="card-surface flex flex-col gap-2 p-4">
              <span className="flex items-center justify-between text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Negociação{raw.negociacao.propostaAtual && <span className="rounded-full px-2 py-px text-[11px] font-semibold" style={{ background: TONS.teal.bg, color: TONS.teal.fg }}>{raw.negociacao.propostaAtual}</span>}</span>
              {raw.negociacao.historico.map((h, i) => (<div key={i} className="flex flex-col border-l-2 pl-2.5" style={{ borderColor: "oklch(0.907 0.014 233.8)" }}><span className="text-[11px] text-muted-foreground">{formatarData(h.data)} · {h.de}</span><span className="text-[13px] leading-snug">{h.texto}</span></div>))}
            </div>
          )}

          {raw.documentos && (
            <div className="card-surface flex flex-col gap-1.5 p-4">
              <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Documentos</span>
              {raw.documentos.map((doc) => (<span key={doc.nome} className="flex items-center gap-2 rounded-[10px] border border-border px-2.5 py-2 text-[12px]"><FileText className="h-3.5 w-3.5 shrink-0 text-teal" /><span className="min-w-0 flex-1 truncate">{doc.nome}</span><span className="rounded-full bg-secondary px-1.5 py-px text-[10px] font-semibold text-muted-foreground uppercase">{doc.tipo}</span></span>))}
            </div>
          )}

          <div className="card-surface flex flex-col gap-2 p-4">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Rascunhos assistidos<span className="rounded-full px-1.5 py-px text-[9px] font-bold" style={{ background: TONS.teal.bg, color: TONS.teal.fg }}>SEM CUSTO DE API</span></span>
            {RASCUNHOS.map((r) => (
              <button key={r.tipo} type="button" onClick={() => abrirRasc(r.tipo, r.label)} className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5 text-left transition-colors hover:border-teal">
                <FileText className="h-4 w-4 shrink-0 text-teal" />
                <span className="flex min-w-0 flex-1 flex-col"><span className="text-[13px] font-medium">{r.label}</span><span className="text-[11px] text-muted-foreground">{r.desc}</span></span>
                <span className="text-[11px] font-semibold text-teal">Gerar →</span>
              </button>
            ))}
            <span className="text-[11px] text-muted-foreground">E-mail já vem pronto. Resposta e acordo geram um <strong>prompt para o Gemini Pro</strong> (você anexa o documento-base) — sem custo de API.</span>
          </div>

          <div className="card-surface flex flex-col gap-2 p-4">
            <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Registrar hora avulsa</span>
            <div className="flex gap-2"><input value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} placeholder="Descrição da atividade" className="h-[34px] min-w-0 flex-1 rounded-[10px] border border-border px-2.5 text-[13px]" /><input value={novosMinutos} onChange={(e) => setNovosMinutos(e.target.value)} placeholder="min" className="h-[34px] w-[62px] rounded-[10px] border border-border px-2.5 text-[13px]" /><button type="button" onClick={lancarHoras} className="btn-teal h-[34px] px-3.5 text-[13px]">Lançar</button></div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={visivelCliente} onChange={(e) => setVisivelCliente(e.target.checked)} style={{ accentColor: "oklch(0.626 0.101 200)", width: 14, height: 14 }} /> Visível ao cliente na planilha-espelho</label>
            {d.atividades.map((a, i) => (<div key={i} className="flex gap-2.5 border-t border-border py-2"><span className="w-12 shrink-0 text-xs text-muted-foreground">{a.data}</span><span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="text-[13px] leading-snug">{a.descricao}</span><span className="flex items-center gap-2 text-[11px] text-muted-foreground">{a.advogado} · {a.minutos} min<span className="rounded-full px-1.5 py-px font-semibold" style={{ background: a.tagBg, color: a.tagFg }}>{a.tag}</span></span></span></div>))}
          </div>

          <div className="flex gap-2"><button type="button" onClick={() => mudarStatus("Respondido")} className="h-9 flex-1 rounded-xl text-[13px] font-semibold" style={{ border: "1px solid oklch(0.732 0.117 194.9 / 0.4)", background: TONS.teal.bg, color: TONS.teal.fg }}>Marcar respondido</button><button type="button" onClick={() => mudarStatus("Finalizado")} className="h-9 flex-1 rounded-xl border border-border bg-card text-[13px] font-semibold">Finalizar</button></div>
        </div>
      </div>

      {rasc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRasc(null)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card" style={{ boxShadow: "0 24px 48px -12px rgb(13 60 85 / 0.4)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div><span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{d.cliente} · {raw.processo?.numero}</span><h3 className="mt-0.5 text-base font-semibold">{rasc.label}</h3></div>
              <button type="button" onClick={() => setRasc(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            {anexoDe(rasc.tipo) ? (
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-[12px]" style={{ background: TONS.teal.bg }}>
                <FileText className="h-3.5 w-3.5 shrink-0" style={{ color: TONS.teal.fg }} />
                <span style={{ color: TONS.teal.fg }}>No Gemini Pro, <strong>anexe o documento-base</strong> ({anexoDe(rasc.tipo)}) e cole este prompt — ele muda só o que varia.</span>
              </div>
            ) : (
              <div className="border-b border-border px-4 py-2 text-[11px] text-muted-foreground">Texto pronto para enviar — revise e ajuste.</div>
            )}
            <textarea value={textoR} onChange={(e) => setTextoR(e.target.value)} className="min-h-[320px] flex-1 resize-none overflow-y-auto border-0 bg-transparent p-4 font-mono text-[12.5px] leading-relaxed text-foreground outline-none" />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
              <span className="text-[11px] text-muted-foreground">Revise antes de enviar — nada é enviado automaticamente.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRasc(null)} className="h-9 rounded-xl border border-border bg-card px-4 text-[13px] font-medium">Fechar</button>
                <button type="button" onClick={copiarRasc} className="btn-teal inline-flex h-9 items-center gap-1.5 px-4 text-[13px]">{copiadoR ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, v, mono }: { label: string; v: string; mono?: boolean }) {
  return (<span className="flex flex-col gap-0.5"><span className="text-[11px] text-muted-foreground">{label}</span><span className={`text-[13px] font-medium ${mono ? "font-mono" : ""}`}>{v}</span></span>);
}

/* ================= tela da tarefa One-Shot ================= */
function OneShotDetalhe({
  d, estOv, onClose, onPrazo, setEst, novaDescricao, setNovaDescricao, novosMinutos, setNovosMinutos, visivelCliente, setVisivelCliente, lancarHoras, mudarStatus,
}: {
  d: Enq; estOv: EstOv; onClose: () => void; onPrazo: (iso: string) => void; setEst: (chave: string, patch: { done?: boolean; min?: string }) => void;
  novaDescricao: string; setNovaDescricao: (v: string) => void; novosMinutos: string; setNovosMinutos: (v: string) => void;
  visivelCliente: boolean; setVisivelCliente: (v: boolean) => void; lancarHoras: () => void; mudarStatus: (s: StatusDemanda) => void;
}) {
  const raw = d.raw;
  const estagios = raw.estagios ?? [];
  const [versoes, setVersoes] = useState(raw.versoes ?? []);
  const [vNota, setVNota] = useState("");
  const [vDe, setVDe] = useState<"Lawi" | "Cliente">("Lawi");
  const [dica, setDica] = useState<{ label: string; texto: string } | null>(null);
  const [copiadoD, setCopiadoD] = useState(false);
  const internos = d.atividades.filter((a) => a.tag === "interno").length;
  const addVersao = () => { if (!vNota.trim()) return; setVersoes((prev) => [...prev, { versao: `v${prev.length + 1}`, data: "2026-08-18", de: vDe, nota: vNota.trim() }]); setVNota(""); };
  const copiarDica = () => { if (!dica) return; navigator.clipboard?.writeText(dica.texto); setCopiadoD(true); setTimeout(() => setCopiadoD(false), 1500); };

  return (
    <div className="mx-auto max-w-[1200px]">
      <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-teal"><ArrowLeft className="h-4 w-4" /> Voltar às tarefas</button>

      <div className="card-surface mt-3 flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{d.cliente}{raw.projeto ? ` · ${raw.projeto}` : ""}</span>
          <h1 className="mt-1 text-xl leading-snug font-semibold text-foreground">{d.titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ border: `1px solid ${d.statusBd}`, background: d.statusBg, color: d.statusFg }}>{d.status}</span>
            <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{d.tipo}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ border: `1px solid ${TONS.teal.bd}`, color: TONS.teal.fg }}>{d.faturamentoLabel}</span>
            <span className="text-xs text-muted-foreground">{d.horas} registradas</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-xl px-3.5 py-2 text-right" style={{ border: `1px solid ${d.prazoBd}`, background: d.prazoBg }}>
            <span className="flex items-center justify-end gap-1.5 text-[10px] font-bold tracking-wide uppercase" style={{ color: d.prazoFg }}><Clock className="h-3 w-3" /> SLA Lawi · 48h</span>
            <span className="flex items-baseline justify-end gap-2"><span className="text-lg font-semibold" style={{ color: d.prazoFg }}>{d.prazoTxt}</span>{d.sufixo ? <span className="text-xs font-medium" style={{ color: d.prazoFg }}>{d.sufixo}</span> : <span className="text-xs text-muted-foreground">ok</span>}</span>
            {raw.recebidoEm && <span className="mt-0.5 block text-[10px] text-muted-foreground">recebido em {formatarData(raw.recebidoEm)}</span>}
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Pencil className="h-3 w-3" /> Alterar:<input type="date" value={d.prazoISO} onChange={(e) => onPrazo(e.target.value)} className="h-7 rounded-lg border border-border bg-card px-2 text-[12px] outline-none focus:ring-2 focus:ring-ring" /></label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">Fluxo da tarefa</h2>
            <div className="mt-4 flex flex-col">
              {estagios.map((e, i) => {
                const meta = TIPO_ESTAGIO[e.tipo];
                const done = estOv[e.chave]?.done ?? e.status === "concluido";
                const atual = !done && e.status === "atual";
                const last = i === estagios.length - 1;
                return (
                  <div key={e.chave} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && <span className="absolute top-6 left-[11px] h-full w-px" style={{ background: done ? TONS.teal.dot : "oklch(0.907 0.014 233.8)" }} />}
                    <span className="z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: done ? TONS.teal.dot : atual ? TONS.amber.dot : "oklch(0.93 0.008 233)" }}>
                      {done ? <CheckCircle2 className="h-4 w-4 text-white" /> : atual ? <Dot className="h-5 w-5 animate-pulse text-white" strokeWidth={6} /> : <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px]" style={{ fontWeight: atual ? 600 : 500, color: e.status === "pendente" && !done ? "oklch(0.541 0.038 234.7)" : "oklch(0.339 0.065 237.2)" }}>{e.label}</span>
                        <span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ background: TONS[meta.tom].bg, color: TONS[meta.tom].fg }}>{meta.label}</span>
                        {e.dicaEmail && <button type="button" onClick={() => setDica({ label: e.label, texto: e.dicaEmail! })} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-px text-[10px] font-semibold text-muted-foreground hover:text-teal"><Mail className="h-3 w-3" /> dica de e-mail</button>}
                      </div>
                      {meta.lawi && (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setEst(e.chave, { done: !done })} className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: done ? TONS.teal.fg : "oklch(0.541 0.038 234.7)" }}>{done ? <CheckCircle2 className="h-4 w-4" style={{ color: TONS.teal.dot }} /> : <Circle className="h-4 w-4" style={{ color: "oklch(0.8 0.01 233)" }} />} {done ? "Concluído" : "Marcar feito"}</button>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground"><input type="number" min={0} placeholder="min" value={estOv[e.chave]?.min ?? ""} onChange={(ev) => setEst(e.chave, { min: ev.target.value })} className="h-7 w-[58px] rounded-lg border border-border bg-card px-1.5 text-[12px] outline-none focus:ring-2 focus:ring-ring" /> min</label>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">Rodadas / versões</h2>
            <div className="mt-3 flex flex-col gap-2">
              {versoes.length === 0 && <p className="text-[13px] text-muted-foreground">Nenhuma versão registrada ainda.</p>}
              {versoes.map((v, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <span className="inline-flex h-7 shrink-0 items-center rounded-lg px-2 text-[12px] font-bold" style={{ background: TONS.teal.bg, color: TONS.teal.fg }}>{v.versao}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">{v.data ? formatarData(v.data) : ""}<span className="rounded-full px-1.5 py-px font-semibold" style={{ background: v.de === "Lawi" ? TONS.teal.bg : TONS.neutral.bg, color: v.de === "Lawi" ? TONS.teal.fg : TONS.neutral.fg }}>{v.de}</span></span>
                    <span className="text-[13px] leading-snug">{v.nota}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-secondary p-[3px]">
                {(["Lawi", "Cliente"] as const).map((x) => (
                  <button key={x} type="button" onClick={() => setVDe(x)} className="h-[28px] rounded-[8px] px-3 text-[12px]" style={vDe === x ? { background: "#fff", boxShadow: "0 1px 2px rgb(13 60 85 / 0.12)", fontWeight: 600, color: "oklch(0.339 0.065 237.2)" } : { fontWeight: 500, color: "oklch(0.541 0.038 234.7)" }}>{x}</button>
                ))}
              </div>
              <input value={vNota} onChange={(e) => setVNota(e.target.value)} placeholder="O que mudou nesta versão" className="h-[34px] min-w-0 flex-1 rounded-[10px] border border-border px-2.5 text-[13px]" />
              <button type="button" onClick={addVersao} className="btn-teal inline-flex h-[34px] items-center gap-1.5 px-3.5 text-[13px]"><Plus className="h-4 w-4" /> Versão</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="card-surface p-4 text-[13px] leading-relaxed text-foreground">{raw.descricao}</p>
          {raw.documentos && raw.documentos.length > 0 && (
            <div className="card-surface flex flex-col gap-1.5 p-4">
              <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Documentos</span>
              {raw.documentos.map((doc) => (<span key={doc.nome} className="flex items-center gap-2 rounded-[10px] border border-border px-2.5 py-2 text-[12px]"><FileText className="h-3.5 w-3.5 shrink-0 text-teal" /><span className="min-w-0 flex-1 truncate">{doc.nome}</span><span className="rounded-full bg-secondary px-1.5 py-px text-[10px] font-semibold text-muted-foreground uppercase">{doc.tipo}</span></span>))}
            </div>
          )}
          <div className="card-surface flex flex-col gap-2 p-4">
            <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Registrar hora avulsa</span>
            <div className="flex gap-2"><input value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} placeholder="Descrição da atividade" className="h-[34px] min-w-0 flex-1 rounded-[10px] border border-border px-2.5 text-[13px]" /><input value={novosMinutos} onChange={(e) => setNovosMinutos(e.target.value)} placeholder="min" className="h-[34px] w-[62px] rounded-[10px] border border-border px-2.5 text-[13px]" /><button type="button" onClick={lancarHoras} className="btn-teal h-[34px] px-3.5 text-[13px]">Lançar</button></div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={visivelCliente} onChange={(e) => setVisivelCliente(e.target.checked)} style={{ accentColor: "oklch(0.626 0.101 200)", width: 14, height: 14 }} /> Visível ao cliente</label>
            {d.atividades.map((a, i) => (<div key={i} className="flex gap-2.5 border-t border-border py-2"><span className="w-12 shrink-0 text-xs text-muted-foreground">{a.data}</span><span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="text-[13px] leading-snug">{a.descricao}</span><span className="flex items-center gap-2 text-[11px] text-muted-foreground">{a.advogado} · {a.minutos} min<span className="rounded-full px-1.5 py-px font-semibold" style={{ background: a.tagBg, color: a.tagFg }}>{a.tag}</span></span></span></div>))}
            {d.atividades.length > 0 && <span className="text-[11px] text-muted-foreground">{internos} lançamento(s) interno(s)</span>}
          </div>
          <div className="flex gap-2"><button type="button" onClick={() => mudarStatus("Aguardando Cliente/3º")} className="h-9 flex-1 rounded-xl text-[13px] font-semibold" style={{ border: "1px solid oklch(0.732 0.117 194.9 / 0.4)", background: TONS.teal.bg, color: TONS.teal.fg }}>Enviar p/ validação</button><button type="button" onClick={() => mudarStatus("Finalizado")} className="h-9 flex-1 rounded-xl border border-border bg-card text-[13px] font-semibold">Concluir</button></div>
        </div>
      </div>

      {dica && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDica(null)}>
          <div className="flex w-full max-w-md flex-col rounded-2xl border border-border bg-card" style={{ boxShadow: "0 24px 48px -12px rgb(13 60 85 / 0.4)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4"><div><span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Dica de e-mail</span><h3 className="mt-0.5 text-base font-semibold">{dica.label}</h3></div><button type="button" onClick={() => setDica(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"><X className="h-4 w-4" /></button></div>
            <p className="p-4 text-[13px] leading-relaxed text-foreground">{dica.texto}</p>
            <div className="flex justify-end gap-2 border-t border-border p-3"><button type="button" onClick={() => setDica(null)} className="h-9 rounded-xl border border-border bg-card px-4 text-[13px] font-medium">Fechar</button><button type="button" onClick={copiarDica} className="btn-teal inline-flex h-9 items-center gap-1.5 px-4 text-[13px]">{copiadoD ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= radar ================= */
function RadarPanel({
  radar, horasClientes, cargaAdvogados, onClose, onOpen,
}: {
  radar: { id: string; cliente: string; titulo: string; sufixo: string; prazoBg: string; prazoFg: string; dia: string; mes: string }[];
  horasClientes: { nome: string; texto: string; pct: string; cor: string }[];
  cargaAdvogados: { nome: string; iniciais: string; abertos: number; criticos: string; cor: string }[];
  onClose: () => void; onOpen: (id: string) => void;
}) {
  return (
    <aside className="hidden w-[330px] shrink-0 flex-col gap-4 self-start rounded-2xl border border-border bg-card p-4 lg:flex">
      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase"><Radar className="h-3.5 w-3.5" /> Radar de prazos · 21 dias</span><button type="button" onClick={onClose} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-muted-foreground"><X className="h-3 w-3" /></button></div>
      {radar.length === 0 && <p className="text-[13px] text-muted-foreground">Sem prazos ativos nos próximos 21 dias.</p>}
      <div className="flex flex-col gap-2.5">{radar.map((r) => (<div key={r.id} onClick={() => onOpen(r.id)} className="ldradar flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-border px-2.5 py-2.5"><span className="flex w-[38px] shrink-0 flex-col items-center rounded-lg py-[3px]" style={{ background: r.prazoBg }}><span className="text-sm leading-tight font-bold" style={{ color: r.prazoFg }}>{r.dia}</span><span className="text-[9px] font-semibold tracking-wide uppercase" style={{ color: r.prazoFg }}>{r.mes}</span></span><span className="flex min-w-0 flex-col gap-0.5"><span className="truncate text-xs font-semibold">{r.cliente} · {r.id}</span><span className="text-[11px] leading-snug text-muted-foreground">{r.titulo}</span><span className="text-[11px] font-semibold" style={{ color: r.prazoFg }}>{r.sufixo}</span></span></div>))}</div>
      <div className="flex flex-col gap-2.5"><span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Horas do mês por cliente</span>{horasClientes.map((h) => (<div key={h.nome} className="flex flex-col gap-1.5"><span className="flex items-baseline justify-between gap-2 text-xs"><span className="font-medium">{h.nome}</span><span className="tabular-nums" style={{ color: h.cor }}>{h.texto}</span></span><span className="h-1.5 overflow-hidden rounded-full bg-secondary"><span className="block h-full" style={{ width: h.pct, background: h.cor }} /></span></div>))}</div>
      {cargaAdvogados.length > 0 && (<div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3"><span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Carga por advogado</span>{cargaAdvogados.map((a) => (<span key={a.nome} className="flex items-center gap-2.5 text-xs"><span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">{a.iniciais}</span><span className="min-w-0 flex-1 truncate">{a.nome}</span><span className="text-muted-foreground">{a.abertos} abertos</span><span className="font-semibold" style={{ color: a.cor }}>{a.criticos}</span></span>))}</div>)}
    </aside>
  );
}

void HOJE;
