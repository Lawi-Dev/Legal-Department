import { cn } from "@/lib/utils";
import { diasRestantes, formatarData, type StatusDemanda } from "@/lib/legal-data";

type Tone = "teal" | "amber" | "danger" | "neutral";

const toneClasses: Record<Tone, string> = {
  teal: "bg-teal-soft text-teal-foreground border-teal/40 dark:text-teal",
  amber: "bg-amber-soft text-amber-foreground border-amber/40",
  danger: "bg-danger-soft text-danger-foreground border-danger/40",
  neutral: "bg-secondary text-muted-foreground border-border",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<StatusDemanda, Tone> = {
  "Pendente Lawi": "amber",
  "Aguardando Cliente/3º": "neutral",
  Respondido: "teal",
  Finalizado: "teal",
};

export function StatusChip({ status }: { status: StatusDemanda }) {
  return <Chip tone={statusTone[status]}>{status}</Chip>;
}

export function PrazoChip({ prazo }: { prazo: string }) {
  const dias = diasRestantes(prazo);
  const tone: Tone = dias < 0 ? "danger" : dias <= 7 ? "amber" : "neutral";
  const sufixo =
    dias < 0
      ? `vencido há ${Math.abs(dias)}d`
      : dias === 0
        ? "hoje"
        : dias <= 7
          ? `em ${dias}d`
          : `em ${dias}d`;
  return (
    <Chip tone={tone}>
      {formatarData(prazo)} · {sufixo}
    </Chip>
  );
}
