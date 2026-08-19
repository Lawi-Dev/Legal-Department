/*
 * Saídas assistidas do caso extrajudicial (sem custo de API):
 *  - E-mail de resumo: texto pronto (espanhol) para enviar ao cliente.
 *  - Resposta / Acordo: PROMPT ENXUTO — só o que muda (resumo, dados, decisão).
 *    O assessor anexa o DOCUMENTO-BASE (.docx do cliente) e cola este prompt no
 *    Gemini Pro; o Gemini adapta só os campos variáveis, mantendo a estrutura.
 */
import type { Demanda } from "./legal-data";

export type TipoRascunho = "email" | "resposta" | "acordo";

export const RASCUNHOS: { tipo: TipoRascunho; label: string; desc: string }[] = [
  { tipo: "email", label: "E-mail de resumo ao cliente", desc: "Texto pronto (espanhol) para enviar ao cliente" },
  { tipo: "resposta", label: "Prompt — Resposta ao Procon", desc: "Cole no Gemini junto com o documento-base" },
  { tipo: "acordo", label: "Prompt — Minuta de acordo", desc: "Cole no Gemini junto com o documento-base" },
];

// Documento-base que o assessor anexa no Gemini (para resposta/acordo).
const ANEXO: Record<TipoRascunho, string> = {
  email: "",
  resposta: "Resposta Extrajudicial do cliente (documento-base .docx)",
  acordo: "Acordo Extrajudicial do cliente (documento-base .docx)",
};
export const anexoDe = (t: TipoRascunho) => ANEXO[t];

const ph = (v: string | undefined, label = "PREENCHER") => (v && v !== "—" ? v : `[${label}]`);

function emailResumo(d: Demanda): string {
  const p = d.procon;
  const orgao = d.processo?.orgao ?? "PROCON";
  const protocolo = p?.protocolo ?? d.processo?.numero ?? "";
  const codigo = d.processo?.codigoAcesso ?? "";
  const consumidor = ph(p?.consumidor.nome, "CONSUMIDOR");
  const servico = ph(p?.compra.servico, "CURSO");
  const valor = ph(p?.compra.valor, "VALOR");
  const pedido = ph(p?.reclamacao.pedido, "PEDIDO");
  const detalhes = ph(p?.reclamacao.detalhes, "RESUMO");
  const prazo = d.prazoFatal ? d.prazoFatal.split("-").reverse().join("/") : "[PRAZO]";
  return [
    `Asunto: ${orgao} — ${consumidor} (Protocolo ${protocolo})`,
    ``,
    `Hola,`,
    ``,
    `Recibimos una nueva reclamación en el ${orgao}. Resumen:`,
    ``,
    `• Consumidor/a: ${consumidor}`,
    `• Protocolo: ${protocolo}${codigo ? ` · Código de acceso: ${codigo}` : ""}`,
    `• Servicio: ${servico} — ${valor}`,
    `• Pedido del consumidor: ${pedido}`,
    `• Plazo de respuesta administrativa: ${prazo}`,
    ``,
    `Reclamación (resumen): ${detalhes}`,
    ``,
    `Quedamos atentos para definir la estrategia (¿negativa o propuesta de acuerdo? ¿hasta qué % de devolución?).`,
    ``,
    `Saludos,`,
    `Lawi — Legal Department`,
  ].join("\n");
}

function dadosDoCaso(d: Demanda): string[] {
  const p = d.procon;
  const c = p?.consumidor;
  const linhas: [string, string | undefined][] = [
    ["Órgão", d.processo?.orgao],
    ["Protocolo", p?.protocolo ?? d.processo?.numero],
    ["Consumidor", c?.nome],
    ["CPF", c?.cpf],
    ["E-mail do consumidor", c?.email],
    ["Endereço", undefined], // não temos — vira [PREENCHER]
    ["Serviço/curso", p?.compra.servico],
    ["Valor total", p?.compra.valor],
    ["Parcelas", p?.compra.parcelas],
    ["Data da contratação", p?.compra.dataContratacao],
    ["Pedido do consumidor", p?.reclamacao.pedido],
  ];
  return linhas.map(([k, v]) => `- ${k}: ${v && v !== "—" ? v : "[PREENCHER]"}`);
}

function decisao(d: Demanda): string {
  const prop = d.negociacao?.propostaAtual;
  const valor = d.procon?.compra.valor ?? "[VALOR]";
  if (prop) {
    return `Acordo — reembolso de ${prop}. Calcular o valor em R$ correspondente sobre ${valor}. Forma de pagamento e dados bancários: [PREENCHER].`;
  }
  return `[DEFINIR — escolher um]:\n  (a) Acordo: reembolso de X% do valor (${valor});\n  (b) Negativa: defesa sem reembolso (curso utilizado / pedido após o prazo de arrependimento de 7 dias / cláusula de fidelidade dos Termos de Uso).`;
}

export function gerarSaida(tipo: TipoRascunho, d: Demanda): string {
  if (tipo === "email") return emailResumo(d);

  const nome = tipo === "resposta" ? "Resposta Extrajudicial" : "Acordo Extrajudicial";
  return [
    `Adapte o documento-base "${nome} do cliente", que segue em ANEXO, ao caso abaixo.`,
    `Altere APENAS os campos variáveis; mantenha a estrutura, as cláusulas fixas, os dados do cliente e o tom do documento-base. Não invente valores, datas ou dados bancários — onde faltar, use [PREENCHER]. Retorne apenas o documento final.`,
    ``,
    `RESUMO DO CASO:`,
    d.descricao,
    ``,
    `DADOS (consumidor e compra):`,
    ...dadosDoCaso(d),
    ``,
    `DECISÃO / RESPOSTA:`,
    decisao(d),
  ].join("\n");
}
