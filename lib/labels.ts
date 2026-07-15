import type { ContatoStatus, PerfilComprador, Porte } from "./types";

export const PERFIL_COMPRADOR_OPTIONS: { value: PerfilComprador; label: string }[] = [
  { value: "dono_socio", label: "Dono ou sócio" },
  { value: "funcionarios", label: "Funcionários" },
  { value: "agencia", label: "Agência" },
  { value: "revendedor", label: "Revendedor" },
  { value: "brindeiro", label: "Brindeiro" },
];

export const PORTE_OPTIONS: { value: Porte; label: string }[] = [
  { value: "grande", label: "Grande" },
  { value: "medio", label: "Médio" },
  { value: "pequeno", label: "Pequeno" },
];

export const PERFIL_COMPRADOR_LABEL = Object.fromEntries(
  PERFIL_COMPRADOR_OPTIONS.map((o) => [o.value, o.label]),
) as Record<PerfilComprador, string>;

export const PORTE_LABEL = Object.fromEntries(
  PORTE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Porte, string>;

export const CONTATO_STATUS_OPTIONS: { value: ContatoStatus; label: string }[] = [
  { value: "realizado", label: "Contato realizado" },
  { value: "tentativa", label: "Tentativa realizada" },
  { value: "nao_realizado", label: "Não realizado" },
];

export const CONTATO_STATUS_LABEL = Object.fromEntries(
  CONTATO_STATUS_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ContatoStatus, string>;

// Cores deliberadamente distintas do badge de Status (Ativo/Inativo/
// Prospecção), pra não confundir os dois selos numa mesma linha.
export const CONTATO_STATUS_COLOR: Record<ContatoStatus, string> = {
  realizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  tentativa: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
  nao_realizado: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400",
};

export const CONTATO_STATUS_SEM_REGISTRO_COLOR = "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300";
