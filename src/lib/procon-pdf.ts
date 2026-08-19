/*
 * Extração do PDF "Detalhes da reclamação - ProconSP Digital - Portal do Fornecedor",
 * 100% client-side, SEM IA (técnica do módulo de PI: pdf.js + regex por rótulo).
 * O PDF é rótulo→valor em linhas verticais (label numa linha, valor na seguinte).
 */
import type { Demanda } from "./legal-data";

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function carregarPdfjs(): Promise<any> {
  const w = window as any;
  if (w.pdfjsLib) return w.pdfjsLib;
  await new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => res();
    s.onerror = () => rej(new Error("Falha ao carregar o leitor de PDF (pdf.js)."));
    document.head.appendChild(s);
  });
  const lib = w.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = WORKER_URL;
  return lib;
}

const SEM_ACENTO = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) =>
  s.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase().replace(/\s+/g, " ").trim();

const isoDate = (br: string) => {
  const m = br.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
};

export type ProconExtraido = {
  protocolo: string;
  prazo: string; // ISO ou ""
  dataSolicitacao: string;
  tipoAtendimento: string;
  classificacao: string;
  orgao: string;
  consumidorNome: string;
  cpf: string;
  email: string;
  telefone: string;
  cidade: string;
  servico: string;
  valor: string;
  parcelas: string;
  dataContratacao: string;
  formaPagamento: string;
  pedido: string;
  reclamacao: string;
  _linhas: string[]; // debug — linhas extraídas
};

export async function extrairPdfProcon(file: File): Promise<ProconExtraido> {
  const pdfjs = await carregarPdfjs();
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;

  const linhas: string[] = [];
  let texto = "";
  const n = Math.min(6, pdf.numPages);
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map((it: any) => it.str).join(" ") + "\n";
    const items = content.items
      .filter((it: any) => it.str && it.str.trim())
      .map((it: any) => ({ str: it.str, x: it.transform[4], y: Math.round(it.transform[5]) }));
    const grupos: Record<string, any[]> = {};
    items.forEach((it: any) => {
      let k = Object.keys(grupos).find((kk) => Math.abs(Number(kk) - it.y) <= 3);
      if (k === undefined) k = String(it.y);
      (grupos[k] ||= []).push(it);
    });
    Object.keys(grupos)
      .sort((a, b) => Number(b) - Number(a))
      .forEach((k) => {
        const l = grupos[k].sort((a, b) => a.x - b.x).map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
        if (l) linhas.push(l);
      });
  }

  // valor na linha seguinte ao rótulo (ocorrência N; pula linhas vazias)
  const valorApos = (rotulo: string, ocorrencia = 1): string => {
    let count = 0;
    for (let i = 0; i < linhas.length - 1; i++) {
      if (norm(linhas[i]) === norm(rotulo)) {
        count++;
        if (count === ocorrencia) return (linhas[i + 1] ?? "").trim();
      }
    }
    return "";
  };

  const orgao = /procon\s*sp|proconsp/i.test(texto)
    ? "Procon-SP"
    : (texto.match(/(PROCON[\s-]?[A-ZÀ-Ú]+)/i)?.[1]?.replace(/\s+/g, "-") ?? "Procon");

  const parcelas = (() => {
    const num = valorApos("Número de parcelas");
    const val = valorApos("Valor da parcela");
    return num ? `${num}x${val ? ` ${val}` : ""}` : "";
  })();

  return {
    protocolo: valorApos("Protocolo") || (texto.match(/Protocolo[:\s]+([\d/]+)/i)?.[1] ?? ""),
    prazo: isoDate(valorApos("Prazo")),
    dataSolicitacao: valorApos("Data da solicitação"),
    tipoAtendimento: valorApos("Tipo de Atendimento"),
    classificacao: valorApos("Classificação"),
    orgao,
    consumidorNome: valorApos("Nome completo"),
    cpf: valorApos("CPF"),
    email: valorApos("Email") || valorApos("E-mail"),
    telefone: valorApos("Celular") || valorApos("Telefone"),
    cidade: valorApos("Cidade"),
    servico: valorApos("Nome do serviço ou plano") || valorApos("Detalhes do serviço ou plano"),
    valor: valorApos("Valor da compra"),
    parcelas,
    dataContratacao: valorApos("Data da contratação"),
    formaPagamento: valorApos("Forma de pagamento"),
    pedido: valorApos("Pedido"),
    reclamacao: valorApos("Detalhes", 2) || valorApos("Detalhes"),
    _linhas: linhas,
  };
}

/* Constrói uma Demanda (caso) a partir do que foi extraído. */
export function demandaDeProcon(x: ProconExtraido): Demanda {
  const id = `PROC-${Math.floor(1000 + Math.random() * 9000)}`;
  const prazo = x.prazo || "";
  return {
    id,
    titulo: x.classificacao ? x.classificacao.split("»").pop()!.trim() : `Reclamação ${x.orgao}`,
    clienteId: "novaedu",
    tipoTarefa: "acompanhamento_procon",
    tipo: "Extrajudicial (Procon)",
    status: "Pendente Lawi",
    responsavel: "Verber Souza",
    prazoFatal: prazo,
    prazoGerencial: prazo,
    avisoDiasAntes: 3,
    descricao: x.reclamacao || "Reclamação importada do Portal Procon.",
    links: [
      { label: "Pasta do Drive — caso", url: "https://drive.google.com/drive/folders/" },
    ],
    processo: { numero: x.protocolo, parte: x.consumidorNome, orgao: x.orgao, codigoAcesso: "—" },
    procon: {
      protocolo: x.protocolo,
      dataSolicitacao: x.dataSolicitacao,
      prazoResposta: prazo,
      tipoAtendimento: x.tipoAtendimento || "Atendimento CIP",
      classificacao: x.classificacao,
      consumidor: { nome: x.consumidorNome, cpf: x.cpf, email: x.email, cidade: x.cidade },
      compra: { servico: x.servico, valor: x.valor, parcelas: x.parcelas, dataContratacao: x.dataContratacao, formaPagamento: x.formaPagamento },
      reclamacao: { detalhes: x.reclamacao, pedido: x.pedido },
    },
    estagios: [
      { chave: "recebida", label: "Demanda recebida", tipo: "registra", status: "concluido" },
      { chave: "coleta", label: "Coleta no Portal Procon", tipo: "manual", status: "concluido" },
      { chave: "analise", label: "Análise + recomendação ao cliente", tipo: "ia", status: "atual" },
      { chave: "estrategia", label: "Estratégia definida (cliente)", tipo: "cliente", status: "pendente" },
      { chave: "resposta", label: "Resposta à manifestação", tipo: "ia", status: "pendente" },
      { chave: "protocolo", label: "Protocolo no sistema do Procon", tipo: "manual", status: "pendente" },
      { chave: "acordo", label: "Acordo + assinatura (DocuSign)", tipo: "manual", status: "pendente" },
      { chave: "pagamento", label: "Pagamento do cliente", tipo: "cliente", status: "pendente" },
      { chave: "encerramento", label: "Encerramento", tipo: "registra", status: "pendente" },
    ],
    documentos: [{ nome: "Detalhes da reclamação - ProconSP Digital.pdf", tipo: "portal" }],
    atividades: [],
  };
}
