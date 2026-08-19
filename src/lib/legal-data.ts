/*
 * Legal Department — SEED DE DEMONSTRAÇÃO (dados 100% fictícios/sintéticos).
 * NÃO contém dados reais de clientes, consumidores ou casos — nenhum nome, CPF,
 * e-mail, telefone ou protocolo real. Serve só para desenvolver/demonstrar a UI.
 * Em produção (Fase 1), os casos reais vivem em banco (Cloudflare D1) e arquivos
 * no R2 — nunca no código. As horas viriam do Notion Tracking Global.
 */

// Tipo de tarefa — define o fluxo/detalhe (é o eixo principal do painel).
export type TipoTarefa = "acompanhamento_procon" | "one_shot";
export const TIPOS_TAREFA: { chave: TipoTarefa; label: string }[] = [
  { chave: "acompanhamento_procon", label: "Acompanhamento Procon" },
  { chave: "one_shot", label: "One-Shot" },
];

// Faturamento é AUTO-determinado pelo cliente (ninguém escolhe na tarefa).
export type Faturamento = "retainer" | "por_tarefa";
// DEMO: em produção a lista de retainer vem de config/DB (não fica hardcoded).
// Nomes fictícios apenas para o seed de demonstração.
const RETAINER = new Set(
  ["NovaEdu", "Aprix", "Zello", "Datamil", "Enkora", "Pluvia", "Sleepwave", "Mantar", "Grifo"].map((s) => s.toLowerCase()),
);
export function faturamentoDe(nomeCliente: string): Faturamento {
  return RETAINER.has(nomeCliente.trim().toLowerCase()) ? "retainer" : "por_tarefa";
}
export const FATURAMENTO_LABEL: Record<Faturamento, string> = { retainer: "Retainer", por_tarefa: "Por tarefa" };

export type StatusDemanda = "Pendente Lawi" | "Aguardando Cliente/3º" | "Respondido" | "Finalizado";
export const STATUS: StatusDemanda[] = ["Pendente Lawi", "Aguardando Cliente/3º", "Respondido", "Finalizado"];

export type TipoDemanda =
  | "Extrajudicial (Procon)"
  | "Notificação extrajudicial"
  | "Revisão de contrato"
  | "Elaboração de contrato"
  | "Consulta jurídica"
  | "Memorando/parecer"
  | "Judicial (ponte)";
export const TIPOS: TipoDemanda[] = [
  "Extrajudicial (Procon)",
  "Notificação extrajudicial",
  "Revisão de contrato",
  "Elaboração de contrato",
  "Consulta jurídica",
  "Memorando/parecer",
  "Judicial (ponte)",
];

export const ADVOGADOS = ["Verber Souza", "Eduardo Cirillo", "Gabriella Consoli", "Rayane Lima"] as const;

/* ---------- Ciclo de vida do caso extrajudicial (Procon) ---------- */
export type TipoEstagio = "registra" | "ia" | "manual" | "cliente";
export type EstagioStatus = "concluido" | "atual" | "pendente";
export type Estagio = { chave: string; label: string; tipo: TipoEstagio; status: EstagioStatus; data?: string; nota?: string; dicaEmail?: string };

// Rodada/versão de uma tarefa one-shot (ex.: revisão de contrato em rounds).
export type Versao = { versao: string; data?: string; de: "Lawi" | "Cliente"; nota: string };

// Modelo canônico (rótulos + tipo). Cada caso preenche status/data/nota.
export const ESTAGIOS_PROCON: { chave: string; label: string; tipo: TipoEstagio }[] = [
  { chave: "recebida", label: "Demanda recebida", tipo: "registra" },
  { chave: "coleta", label: "Coleta no Portal Procon", tipo: "manual" },
  { chave: "analise", label: "Análise + recomendação ao cliente", tipo: "ia" },
  { chave: "estrategia", label: "Estratégia definida (cliente)", tipo: "cliente" },
  { chave: "resposta", label: "Resposta à manifestação", tipo: "ia" },
  { chave: "protocolo", label: "Protocolo no sistema do Procon", tipo: "manual" },
  { chave: "acordo", label: "Acordo + assinatura (DocuSign)", tipo: "manual" },
  { chave: "pagamento", label: "Pagamento do cliente", tipo: "cliente" },
  { chave: "encerramento", label: "Encerramento", tipo: "registra" },
];

/* ---------- Cliente ---------- */
export type Cliente = {
  id: string;
  nome: string;
  responsavel: string;
  idioma: "PT" | "EN" | "ES";
  driveUrl: string;
  horasContratadas: number; // fonte: Notion Tracking Global (Lawrita/WhatsApp ou manual)
  horasUsadas: number;
  segmento: string;
};

export const CLIENTES: Cliente[] = [
  {
    id: "novaedu",
    nome: "NovaEdu",
    responsavel: "Verber Souza",
    idioma: "ES",
    driveUrl: "https://drive.google.com/drive/folders/demo-novaedu",
    horasContratadas: 20,
    horasUsadas: 8.5,
    segmento: "Edtech (cursos livres) · Brasil",
  },
  {
    id: "aprix",
    nome: "Aprix",
    responsavel: "Verber Souza",
    idioma: "ES",
    driveUrl: "https://drive.google.com/drive/folders/demo-aprix",
    horasContratadas: 10,
    horasUsadas: 2.0,
    segmento: "Edtech (marca Kurso) · Brasil",
  },
];

// Estágios canônicos de uma tarefa one-shot (fluxo de rodadas), com a dica de
// e-mail de cada etapa da jornada do cliente.
export const ESTAGIOS_ONESHOT: { chave: string; label: string; tipo: TipoEstagio; dicaEmail: string }[] = [
  { chave: "recebido", label: "Recebido", tipo: "registra", dicaEmail: "Confirmar o recebimento e informar o prazo estimado de retorno." },
  { chave: "analise", label: "Em análise", tipo: "manual", dicaEmail: "Se faltar informação/documento, solicitar ao cliente antes de avançar." },
  { chave: "validacao", label: "Enviado p/ validação", tipo: "cliente", dicaEmail: "Enviar a minuta/revisão para validação, com um resumo dos pontos de atenção." },
  { chave: "rodadas", label: "Rodadas de ajuste", tipo: "manual", dicaEmail: "Reenviar a nova versão destacando o que mudou desde a anterior." },
  { chave: "concluido", label: "Concluído", tipo: "registra", dicaEmail: "Entregar a versão final e registrar o encerramento." },
];

/* ---------- Demanda ---------- */
export type Atividade = { id: string; data: string; advogado: string; descricao: string; minutos: number; visivelCliente: boolean };

export type ProconDetalhe = {
  protocolo: string;
  dataSolicitacao: string;
  prazoResposta: string;
  tipoAtendimento: string;
  classificacao: string;
  consumidor: { nome: string; cpf?: string; email?: string; telefone?: string; cidade?: string };
  compra: { servico: string; valor: string; parcelas?: string; dataContratacao?: string; formaPagamento?: string };
  reclamacao: { detalhes: string; pedido: string };
};

export type Documento = { nome: string; tipo: "email" | "portal" | "contrato" | "resposta" | "acordo" | "comprovante" };
export type Proposta = { data: string; de: string; texto: string };

export type Demanda = {
  id: string;
  titulo: string;
  clienteId: string;
  tipoTarefa: TipoTarefa;
  tipo: TipoDemanda;
  status: StatusDemanda;
  responsavel: string;
  prazoFatal: string;
  prazoGerencial: string;
  avisoDiasAntes: number;
  descricao: string;
  links: { label: string; url: string }[];
  processo?: { numero: string; parte: string; orgao: string; codigoAcesso: string };
  procon?: ProconDetalhe;
  estagios?: Estagio[];
  documentos?: Documento[];
  negociacao?: { propostaAtual?: string; historico: Proposta[] };
  projeto?: string; // one-shot: referência do projeto/intake (ex.: "Proyecto Comercial NovaEdu")
  versoes?: Versao[]; // one-shot: rodadas/versões
  recebidoEm?: string; // quando a demanda entrou (base do SLA Lawi de 48h)
  atividades: Atividade[];
};

// SLA Lawi: 48h a partir do recebimento da demanda.
export const SLA_HORAS = 48;
export function slaInfo(recebidoEm?: string) {
  if (!recebidoEm) return null;
  const venc = new Date(new Date(`${recebidoEm}T00:00:00`).getTime() + SLA_HORAS * 3_600_000);
  const horas = Math.round((venc.getTime() - HOJE.getTime()) / 3_600_000);
  return { vencISO: venc.toISOString().slice(0, 10), horas, estourado: horas < 0 };
}

function estOneShot(concluidos: string[], atual: string): Estagio[] {
  return ESTAGIOS_ONESHOT.map((e) => ({
    chave: e.chave, label: e.label, tipo: e.tipo, dicaEmail: e.dicaEmail,
    status: concluidos.includes(e.chave) ? "concluido" : e.chave === atual ? "atual" : "pendente",
  }));
}

export const DEMANDAS: Demanda[] = [
  /* ===== ONE-SHOT — Proyecto Comercial NovaEdu (demo, 3 tarefas) ===== */
  {
    id: "OS-01",
    titulo: "Revisão — NovaEdu como afiliada de Vionix",
    clienteId: "novaedu",
    tipoTarefa: "one_shot",
    tipo: "Revisão de contrato",
    status: "Pendente Lawi",
    responsavel: "Verber Souza",
    prazoFatal: "2026-08-20",
    prazoGerencial: "2026-08-20",
    avisoDiasAntes: 1,
    recebidoEm: "2026-08-18",
    descricao:
      "O parceiro Vionix enviou o contrato em que a NovaEdu atua como sua afiliada. As comissões já estão acordadas — revisar e apontar cláusulas prejudiciais ao cliente.",
    links: [
      { label: "Thread de e-mail — Proyecto Comercial NovaEdu", url: "https://mail.google.com/thread/demo-novaedu-vionix" },
      { label: "Pasta do Drive — Projeto Comercial", url: "https://drive.google.com/drive/folders/demo-proj-comercial" },
    ],
    projeto: "Proyecto Comercial NovaEdu",
    estagios: estOneShot(["recebido"], "analise"),
    versoes: [{ versao: "v1", data: "2026-08-18", de: "Cliente", nota: "Contrato enviado pelo parceiro para revisão." }],
    documentos: [{ nome: "Contrato Vionix — NovaEdu afiliada.pdf", tipo: "contrato" }],
    atividades: [],
  },
  {
    id: "OS-02",
    titulo: "Elaboração — Vionix como afiliada de NovaEdu/Kurso",
    clienteId: "novaedu",
    tipoTarefa: "one_shot",
    tipo: "Elaboração de contrato",
    status: "Pendente Lawi",
    responsavel: "Verber Souza",
    prazoFatal: "2026-08-19",
    prazoGerencial: "2026-08-19",
    avisoDiasAntes: 1,
    recebidoEm: "2026-08-17",
    descricao:
      "Redigir o contrato em que a Vionix atua como afiliada da NovaEdu, similar ao modelo de influencers. Comissões por faixa (alta/média/baixa) conforme tabela do projeto; alunos que comprarem via parceiro têm desconto acordado.",
    links: [
      { label: "Thread de e-mail — Proyecto Comercial NovaEdu", url: "https://mail.google.com/thread/demo-novaedu-vionix" },
      { label: "Modelo — Contrato de influencers", url: "https://drive.google.com/file/demo-modelo-influencers" },
    ],
    projeto: "Proyecto Comercial NovaEdu",
    estagios: estOneShot([], "recebido"),
    versoes: [],
    documentos: [{ nome: "Modelo — Contrato de influencers.docx", tipo: "contrato" }],
    atividades: [],
  },
  {
    id: "OS-03",
    titulo: "Contrato de patrocínio — Torneio de Matemática",
    clienteId: "novaedu",
    tipoTarefa: "one_shot",
    tipo: "Elaboração de contrato",
    status: "Pendente Lawi",
    responsavel: "Verber Souza",
    prazoFatal: "2026-08-18",
    prazoGerencial: "2026-08-18",
    avisoDiasAntes: 1,
    recebidoEm: "2026-08-16",
    descricao:
      "Elaborar o contrato em que a Vionix é patrocinadora institucional do Torneio de Matemática (competição promovida pela NovaEdu). A obrigação da Vionix se limita a promover o Torneio entre sua base; a Vionix é divulgada nas páginas/comunicações do evento.",
    links: [{ label: "Thread de e-mail — Proyecto Comercial NovaEdu", url: "https://mail.google.com/thread/demo-novaedu-vionix" }],
    projeto: "Proyecto Comercial NovaEdu",
    estagios: estOneShot([], "recebido"),
    versoes: [],
    documentos: [],
    atividades: [],
  },

  /* ===== CASO DEMO 1 — Beatriz Nunes (protocolo fictício) ===== */
  {
    id: "PROC-2601",
    titulo: "Retenção de valores de curso — pedido de cessação de cobranças",
    clienteId: "novaedu",
    tipoTarefa: "acompanhamento_procon",
    tipo: "Extrajudicial (Procon)",
    status: "Respondido",
    responsavel: "Eduardo Cirillo",
    prazoFatal: "2026-08-03",
    prazoGerencial: "2026-07-31",
    avisoDiasAntes: 3,
    descricao:
      "Consumidora alega retenção integral abusiva após uso parcial do curso; não pede reembolso do período usado, mas a cessação das faturas futuras. Risco de manifestação técnica do Procon a favor da consumidora e eventual judicialização. Caso encaminhado a processo administrativo pela demora de resposta.",
    links: [
      { label: "Thread de e-mail — Procon Interação do Consumidor", url: "https://mail.google.com/thread/demo-caso-1" },
      { label: "Pasta do Drive — CASO DEMO 1", url: "https://drive.google.com/drive/folders/demo-caso-1" },
    ],
    processo: { numero: "1550420/2026", parte: "Beatriz Nunes", orgao: "Procon-SP", codigoAcesso: "9#00xxA*0aBc#000" },
    procon: {
      protocolo: "1550420/2026",
      dataSolicitacao: "2026-07-24",
      prazoResposta: "2026-08-03",
      tipoAtendimento: "Atendimento CIP",
      classificacao: "Educação » Cursos Livres » Cobrança / Contestação » Retenção de valores",
      consumidor: { nome: "Beatriz Nunes", cidade: "São Paulo · SP" },
      compra: { servico: "Curso Pré-vestibular (Enem + vestibulares 2026)", valor: "R$ 3.840,00", parcelas: "12x no crédito", dataContratacao: "2026-03", formaPagamento: "Cartão de crédito" },
      reclamacao: {
        detalhes: "Reconhece uso parcial do curso, mas considera abusivo o cobro integral sem poder utilizá-lo. Aberta a pagar valor justo.",
        pedido: "Cessação das faturas futuras (ou reembolso proporcional).",
      },
    },
    estagios: [
      { chave: "recebida", label: "Demanda recebida", tipo: "registra", status: "concluido", data: "2026-07-24", nota: "Cliente encaminhou o e-mail do Procon" },
      { chave: "coleta", label: "Coleta no Portal Procon", tipo: "manual", status: "concluido", data: "2026-07-25" },
      { chave: "analise", label: "Análise + recomendação ao cliente", tipo: "ia", status: "concluido", data: "2026-08-07", nota: "Recomendado avaliar cessação de futuros / reembolso proporcional" },
      { chave: "estrategia", label: "Estratégia definida (cliente)", tipo: "cliente", status: "concluido", data: "2026-08-10", nota: "Cliente: teto de 35% de devolução" },
      { chave: "resposta", label: "Resposta à manifestação", tipo: "ia", status: "atual", data: "2026-08-17", nota: "Proposta de 20% enviada para validação" },
      { chave: "protocolo", label: "Protocolo no sistema do Procon", tipo: "manual", status: "pendente", nota: "⚠ caso encaminhado a processo administrativo pela demora" },
      { chave: "acordo", label: "Acordo + assinatura (DocuSign)", tipo: "manual", status: "pendente" },
      { chave: "pagamento", label: "Pagamento do cliente", tipo: "cliente", status: "pendente" },
      { chave: "encerramento", label: "Encerramento", tipo: "registra", status: "pendente" },
    ],
    documentos: [
      { nome: "E-mail — Fwd Fundação Procon-SP (Interação do Consumidor)", tipo: "email" },
      { nome: "Resposta Extrajudicial - Beatriz Nunes Acordo.docx", tipo: "acordo" },
    ],
    negociacao: {
      propostaAtual: "20% de reembolso",
      historico: [
        { data: "2026-08-10", de: "Cliente (Marta)", texto: "Aceita negociar, mas devolução no máx. 35% — de preferência menos." },
        { data: "2026-08-14", de: "Cliente (Marta)", texto: "35% de entrada é alto; tentar % menor." },
        { data: "2026-08-17", de: "Lawi (Eduardo)", texto: "Proposta de acordo por 20% do valor." },
      ],
    },
    atividades: [
      { id: "a1", data: "2026-08-07", advogado: "Verber Souza", descricao: "Análise do caso e recomendação de estratégia ao cliente.", minutos: 40, visivelCliente: true },
      { id: "a2", data: "2026-08-11", advogado: "Eduardo Cirillo", descricao: "Elaboração da resposta e minuta de acordo para aprovação.", minutos: 90, visivelCliente: true },
      { id: "a3", data: "2026-08-17", advogado: "Eduardo Cirillo", descricao: "Ajuste da proposta para 20% e reenvio ao cliente.", minutos: 35, visivelCliente: false },
    ],
  },

  /* ===== CASO DEMO 2 — Rafael Teixeira (protocolo fictício) ===== */
  {
    id: "PROC-2599",
    titulo: "Cancelamento de curso com restituição — cláusula de fidelidade",
    clienteId: "novaedu",
    tipoTarefa: "acompanhamento_procon",
    tipo: "Extrajudicial (Procon)",
    status: "Finalizado",
    responsavel: "Eduardo Cirillo",
    prazoFatal: "2026-05-29",
    prazoGerencial: "2026-05-27",
    avisoDiasAntes: 3,
    descricao:
      "Consumidor pede cancelamento e devolução das parcelas no cartão, alegando desconhecimento da cláusula de fidelidade. Após confirmação dos dados de compra, formalizado acordo e pagamento. Caso finalizado pelo sistema.",
    links: [
      { label: "Thread de e-mail — Procon CIP", url: "https://mail.google.com/thread/demo-caso-2" },
      { label: "Pasta do Drive — CASO DEMO 2", url: "https://drive.google.com/drive/folders/demo-caso-2" },
    ],
    processo: { numero: "1400200/2026", parte: "Rafael Teixeira", orgao: "Procon-SP", codigoAcesso: "8%00yZZa00Aa*000" },
    procon: {
      protocolo: "1400200/2026",
      dataSolicitacao: "2026-05-19",
      prazoResposta: "2026-05-29",
      tipoAtendimento: "Atendimento CIP",
      classificacao: "Educação » Cursos Livres » Cobrança / Contestação » Dificuldade na devolução de valores",
      consumidor: { nome: "Rafael Teixeira", cpf: "123.456.789-00", email: "rafael.teixeira@exemplo.com", telefone: "(11) 90000-0000", cidade: "São Paulo · SP" },
      compra: { servico: "Curso Enem + vestibulares 2026", valor: "R$ 2.520,00", parcelas: "4x R$ 210,00", dataContratacao: "2026-03-06", formaPagamento: "Cartão (Mastercard)" },
      reclamacao: {
        detalhes: "Familiar não fará o curso; solicitou cancelamento. Alega não ter assinado o termo nem ciência da fidelidade.",
        pedido: "Cancelamento com restituição do valor pago (estorno no cartão).",
      },
    },
    estagios: [
      { chave: "recebida", label: "Demanda recebida", tipo: "registra", status: "concluido", data: "2026-05-19" },
      { chave: "coleta", label: "Coleta no Portal Procon", tipo: "manual", status: "concluido", data: "2026-05-20" },
      { chave: "analise", label: "Análise + recomendação ao cliente", tipo: "ia", status: "concluido", data: "2026-05-22" },
      { chave: "estrategia", label: "Estratégia definida (cliente)", tipo: "cliente", status: "concluido", data: "2026-05-28" },
      { chave: "resposta", label: "Resposta à manifestação", tipo: "ia", status: "concluido", data: "2026-05-28", nota: "Solicitada confirmação dos dados de compra (divergentes)" },
      { chave: "protocolo", label: "Protocolo no sistema do Procon", tipo: "manual", status: "concluido", data: "2026-05-28" },
      { chave: "acordo", label: "Acordo + assinatura (DocuSign)", tipo: "manual", status: "concluido", data: "2026-06-17" },
      { chave: "pagamento", label: "Pagamento do cliente", tipo: "cliente", status: "concluido" },
      { chave: "encerramento", label: "Encerramento", tipo: "registra", status: "concluido", nota: "Finalizado pelo sistema" },
    ],
    documentos: [
      { nome: "Detalhes da reclamação - ProconSP Digital.pdf", tipo: "portal" },
      { nome: "Termos e condições.pdf", tipo: "contrato" },
      { nome: "ACORDO_EXTRAJUDICIAL_Rafael.docx", tipo: "acordo" },
      { nome: "Comprovante Pagamento - Rafael Teixeira.pdf", tipo: "comprovante" },
    ],
    negociacao: { historico: [{ data: "2026-06-05", de: "Consumidor", texto: "Confirmou os dados; acordo e pagamento formalizados por e-mail." }] },
    atividades: [
      { id: "a1", data: "2026-05-22", advogado: "Eduardo Cirillo", descricao: "Análise do caso e recomendações ao cliente.", minutos: 55, visivelCliente: true },
      { id: "a2", data: "2026-05-28", advogado: "Eduardo Cirillo", descricao: "Resposta ao Procon solicitando confirmação de dados.", minutos: 40, visivelCliente: true },
      { id: "a3", data: "2026-06-17", advogado: "Eduardo Cirillo", descricao: "Formalização do acordo extrajudicial.", minutos: 60, visivelCliente: true },
    ],
  },

  /* ===== CASO DEMO 3 — Larissa Farias (protocolo fictício) ===== */
  {
    id: "PROC-2600",
    titulo: "Reembolso de curso — acordo extrajudicial (30%)",
    clienteId: "novaedu",
    tipoTarefa: "acompanhamento_procon",
    tipo: "Extrajudicial (Procon)",
    status: "Finalizado",
    responsavel: "Rayane Lima",
    prazoFatal: "2026-04-01",
    prazoGerencial: "2026-03-30",
    avisoDiasAntes: 3,
    descricao:
      "Resposta ao Procon-CE com proposta de reembolso de 30% dos valores pagos. Termo de acordo extrajudicial enviado e assinado pelas partes; pagamento realizado e comprovante enviado à consumidora.",
    links: [
      { label: "Thread de e-mail — Demanda legal", url: "https://mail.google.com/thread/demo-caso-3" },
      { label: "Pasta do Drive — CASO DEMO 3", url: "https://drive.google.com/drive/folders/demo-caso-3" },
    ],
    processo: { numero: "2600000100100000000", parte: "Larissa Farias", orgao: "Procon-CE", codigoAcesso: "—" },
    procon: {
      protocolo: "2600000100100000000",
      dataSolicitacao: "2026-03-09",
      prazoResposta: "2026-04-01",
      tipoAtendimento: "Notificação",
      classificacao: "Educação » Cursos Livres » Devolução de valores",
      consumidor: { nome: "Larissa Farias", cidade: "Ceará" },
      compra: { servico: "Curso preparatório", valor: "—", formaPagamento: "Cartão" },
      reclamacao: { detalhes: "Pedido de reembolso dos valores pagos.", pedido: "Devolução dos valores." },
    },
    estagios: [
      { chave: "recebida", label: "Demanda recebida", tipo: "registra", status: "concluido", data: "2026-03-09" },
      { chave: "coleta", label: "Coleta no Portal Procon", tipo: "manual", status: "concluido", data: "2026-03-10" },
      { chave: "analise", label: "Análise + recomendação ao cliente", tipo: "ia", status: "concluido", data: "2026-03-12" },
      { chave: "estrategia", label: "Estratégia definida (cliente)", tipo: "cliente", status: "concluido", data: "2026-03-15", nota: "Reembolso de 30%" },
      { chave: "resposta", label: "Resposta à manifestação", tipo: "ia", status: "concluido", data: "2026-03-20" },
      { chave: "protocolo", label: "Protocolo no sistema do Procon", tipo: "manual", status: "concluido", data: "2026-03-20" },
      { chave: "acordo", label: "Acordo + assinatura (DocuSign)", tipo: "manual", status: "concluido", data: "2026-06-05", nota: "Termo assinado pelas partes" },
      { chave: "pagamento", label: "Pagamento do cliente", tipo: "cliente", status: "concluido", data: "2026-06-17" },
      { chave: "encerramento", label: "Encerramento", tipo: "registra", status: "concluido" },
    ],
    documentos: [
      { nome: "Resposta_Extrajudicial - Larissa.docx", tipo: "resposta" },
      { nome: "ACORDO_EXTRAJUDICIAL_Larissa.docx", tipo: "acordo" },
      { nome: "Comprovante Pagamento - Larissa.png", tipo: "comprovante" },
    ],
    negociacao: {
      propostaAtual: "30% de reembolso (firmado)",
      historico: [
        { data: "2026-03-20", de: "Lawi", texto: "Proposta de reembolso de 30% ao Procon-CE." },
        { data: "2026-05-27", de: "Lawi", texto: "Termo de acordo extrajudicial enviado." },
        { data: "2026-06-05", de: "Partes", texto: "Termo assinado; aguardando comprovante." },
      ],
    },
    atividades: [
      { id: "a1", data: "2026-03-12", advogado: "Rayane Lima", descricao: "Análise do caso e recomendação ao cliente.", minutos: 50, visivelCliente: true },
      { id: "a2", data: "2026-03-20", advogado: "Rayane Lima", descricao: "Resposta formal ao Procon-CE com proposta de 30%.", minutos: 70, visivelCliente: true },
      { id: "a3", data: "2026-06-05", advogado: "Rayane Lima", descricao: "Envio do termo de acordo para assinatura.", minutos: 30, visivelCliente: true },
    ],
  },
];

export const HOJE = new Date("2026-08-18T00:00:00");

export function diasRestantes(prazoISO: string) {
  const alvo = new Date(`${prazoISO}T00:00:00`);
  return Math.round((alvo.getTime() - HOJE.getTime()) / 86_400_000);
}
export function formatarData(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
export function clientePorId(id: string) {
  return CLIENTES.find((c) => c.id === id);
}
export function nomeCliente(id: string) {
  return clientePorId(id)?.nome ?? id;
}
export function demandasOrdenadas() {
  return [...DEMANDAS].sort((a, b) => a.prazoFatal.localeCompare(b.prazoFatal));
}
