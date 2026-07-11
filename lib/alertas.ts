export type PeriodoPedido = "1" | "3" | "6" | "sem_pedido";

export const PERIODO_PEDIDO_LABEL: Record<PeriodoPedido, string> = {
  "1": "Pedidos feitos há 1 mês",
  "3": "Pedidos feitos há 3 meses",
  "6": "Pedidos feitos há 6 meses",
  sem_pedido: "Sem pedidos registrados",
};

function mesesAtras(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

/** Bucket mais alto que o cliente atinge (cumulativo: 6 meses inclui 3 e 1). */
export function bucketUltimoPedido(
  status: string,
  ultimoPedido: string | null,
): PeriodoPedido | null {
  if (status !== "ativo") return null;
  if (!ultimoPedido) return "sem_pedido";
  const data = new Date(ultimoPedido);
  if (data <= mesesAtras(6)) return "6";
  if (data <= mesesAtras(3)) return "3";
  if (data <= mesesAtras(1)) return "1";
  return null;
}

export function diasDesde(dataISO: string) {
  const diffMs = new Date().getTime() - new Date(dataISO).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export type AniversarioInfo = {
  proximaData: Date;
  diasRestantes: number;
  tier: "30" | "45" | "60" | null;
};

/** Calcula a próxima ocorrência (dia/mês) do aniversário e quantos dias faltam. */
export function calcularProximoAniversario(dataFundacaoISO: string): AniversarioInfo {
  const fundacao = new Date(dataFundacaoISO);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let proxima = new Date(hoje.getFullYear(), fundacao.getMonth(), fundacao.getDate());
  if (proxima < hoje) {
    proxima = new Date(hoje.getFullYear() + 1, fundacao.getMonth(), fundacao.getDate());
  }

  const diasRestantes = Math.round(
    (proxima.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
  );

  let tier: AniversarioInfo["tier"] = null;
  if (diasRestantes <= 30) tier = "30";
  else if (diasRestantes <= 45) tier = "45";
  else if (diasRestantes <= 60) tier = "60";

  return { proximaData: proxima, diasRestantes, tier };
}

export const ANIVERSARIO_TIER_COLOR: Record<string, string> = {
  "30": "bg-red-100 text-red-800",
  "45": "bg-orange-100 text-orange-800",
  "60": "bg-amber-100 text-amber-800",
};
