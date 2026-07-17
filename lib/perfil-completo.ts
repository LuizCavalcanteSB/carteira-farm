import type { SupabaseClient } from "@supabase/supabase-js";

// Trava de qualidade antes de um lead de /novos-contatos entrar na carteira:
// precisa ter observação, pedido, foto e link do Bitrix registrados, senão o
// card entra "vazio" na carteira do consultor.
export const PENDENCIA_LABEL = {
  observacao: "observação",
  pedido: "pedido",
  foto: "foto",
  link_bitrix: "link do Bitrix",
} as const;

export type Pendencia = keyof typeof PENDENCIA_LABEL;

function idsComRegistro(rows: { client_id: string }[] | null) {
  return new Set((rows ?? []).map((r) => r.client_id));
}

/** Verifica vários clientes de uma vez (usado na listagem do Kanban). */
export async function verificarPerfisCompletos(
  supabase: SupabaseClient,
  clientes: { id: string; historico_qtd_compras: number }[],
): Promise<Map<string, Pendencia[]>> {
  const ids = clientes.map((c) => c.id);
  if (ids.length === 0) return new Map();

  const [notas, pedidos, fotos, links] = await Promise.all([
    supabase.from("client_notes").select("client_id").in("client_id", ids),
    supabase.from("orders").select("client_id").in("client_id", ids),
    supabase.from("order_photos").select("client_id").in("client_id", ids),
    supabase.from("client_links").select("client_id").in("client_id", ids),
  ]);

  const idsComNota = idsComRegistro(notas.data);
  const idsComPedido = idsComRegistro(pedidos.data);
  const idsComFoto = idsComRegistro(fotos.data);
  const idsComLink = idsComRegistro(links.data);

  const pendenciasPorCliente = new Map<string, Pendencia[]>();
  for (const cliente of clientes) {
    const pendencias: Pendencia[] = [];
    if (!idsComNota.has(cliente.id)) pendencias.push("observacao");
    if (!idsComPedido.has(cliente.id) && !(cliente.historico_qtd_compras > 0))
      pendencias.push("pedido");
    if (!idsComFoto.has(cliente.id)) pendencias.push("foto");
    if (!idsComLink.has(cliente.id)) pendencias.push("link_bitrix");
    pendenciasPorCliente.set(cliente.id, pendencias);
  }
  return pendenciasPorCliente;
}

/** Verifica um único cliente (usado na action que confirma a inclusão na
 * carteira — trava de verdade, não só visual, já que a action pode ser
 * chamada direto). */
export async function verificarPerfilCompleto(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Pendencia[]> {
  const { data: cliente } = await supabase
    .from("clients")
    .select("id, historico_qtd_compras")
    .eq("id", clientId)
    .single();

  if (!cliente) return [];

  const pendencias = await verificarPerfisCompletos(supabase, [cliente]);
  return pendencias.get(clientId) ?? [];
}
