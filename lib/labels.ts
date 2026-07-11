import type { PerfilComprador, Porte } from "./types";

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
