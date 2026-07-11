// Pedidos com data anterior a este dia já estão representados nos campos
// historico_* do cliente (importados da planilha) — a view client_stats no
// banco ignora esses pedidos ao somar as estatísticas, para não duplicar.
// Pedidos com data igual ou posterior contam normalmente.
export const ORDERS_LIVE_CUTOFF = "2026-07-11";

export function contaNasEstatisticas(dataPedido: string) {
  return dataPedido >= ORDERS_LIVE_CUTOFF;
}
