export const NOTIFICACAO_ANTECEDENCIA_DIAS = 3;

/** Data limite (inclusive) para considerar um prazo_entrega como notificável. */
export function limiteNotificacaoEntrega() {
  const limite = new Date();
  limite.setHours(0, 0, 0, 0);
  limite.setDate(limite.getDate() + NOTIFICACAO_ANTECEDENCIA_DIAS);
  const y = limite.getFullYear();
  const m = String(limite.getMonth() + 1).padStart(2, "0");
  const d = String(limite.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
