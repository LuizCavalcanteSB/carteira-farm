import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "./paginate";
import { bucketUltimoPedido, calcularProximoAniversario, diasDesde } from "./alertas";
import { diasAte } from "./date";
import { mensagemEntrega, mensagemNovoContato } from "./notificacoes-feed";

export type RotinaKind =
  | "entrega"
  | "aniversario"
  | "pedido_parado"
  | "novo_contato"
  | "plano_acao";

export type RotinaItem = {
  id: string;
  clientId: string;
  clientName: string;
  cnpj: string | null;
  cpf: string | null;
  consultantId: string;
  kind: RotinaKind;
  mensagem: string;
  diasRestantes: number;
};

export type RotinaGrupo = "atrasado" | "hoje" | "semana" | "mes";

export const ROTINA_GRUPO_LABEL: Record<RotinaGrupo, string> = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
};

/** Bucket de urgência a partir de dias restantes — negativo = atrasado, 0 =
 * hoje, até 7 = esta semana, até 30 = este mês. Além de 30 dias não entra
 * na Rotina (fica só nos Alertas de aniversário, que olham 60 dias). */
export function bucketRotina(diasRestantes: number): RotinaGrupo | null {
  if (diasRestantes < 0) return "atrasado";
  if (diasRestantes === 0) return "hoje";
  if (diasRestantes <= 7) return "semana";
  if (diasRestantes <= 30) return "mes";
  return null;
}

const PEDIDO_PARADO_LABEL: Record<string, string> = {
  "1": "Sem pedido há 1 mês",
  "3": "Sem pedido há 3 meses",
  "6": "Sem pedido há 6 meses",
  sem_pedido: "Nunca fez um pedido",
};

/** Monta a lista unificada da página Rotina: prazos de entrega, aniversários
 * de empresa, pedidos parados, novos contatos aguardando e ações do plano de
 * ação — tudo que precisa de atenção do consultor, num só lugar. Novo
 * contato e pedido parado não têm uma data futura de verdade (são
 * pendências contínuas), então sempre caem no bucket "atrasado". */
export async function buildRotinaItems(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
  consultorFiltro?: string,
): Promise<RotinaItem[]> {
  const escopo = isAdmin ? consultorFiltro || null : userId;

  let carteiraQuery = supabase
    .from("clients")
    .select("id, nome, cnpj, cpf, consultant_id, status, prazo_entrega, aniversario_empresa")
    .eq("na_carteira", true);
  if (escopo) carteiraQuery = carteiraQuery.eq("consultant_id", escopo);

  let statsQuery = supabase
    .from("client_stats")
    .select("client_id, ultimo_pedido")
    .eq("na_carteira", true);
  if (escopo) statsQuery = statsQuery.eq("consultant_id", escopo);

  let novosContatosQuery = supabase
    .from("clients")
    .select("id, nome, cnpj, cpf, consultant_id, created_at")
    .eq("na_carteira", false)
    .eq("estagio_contato", "contato_novo");
  if (escopo) novosContatosQuery = novosContatosQuery.eq("consultant_id", escopo);

  const acaoQuery = supabase
    .from("client_action_items")
    .select(
      "id, client_id, descricao, data_prevista, cliente:clients(nome, cnpj, cpf, consultant_id)",
    )
    .eq("concluido", false);

  const [
    { data: carteira },
    { data: stats },
    { data: novosContatos },
    { data: acaoItens },
  ] = await Promise.all([
    fetchAllRows((from, to) => carteiraQuery.range(from, to)),
    fetchAllRows((from, to) => statsQuery.range(from, to)),
    fetchAllRows((from, to) => novosContatosQuery.range(from, to)),
    fetchAllRows((from, to) => acaoQuery.range(from, to)),
  ]);

  const ultimoPedidoByClient = new Map(
    (stats ?? []).map((s) => [s.client_id, s.ultimo_pedido as string | null]),
  );

  const itensEntrega: RotinaItem[] = (carteira ?? [])
    .filter((c) => c.prazo_entrega)
    .map((c) => {
      const dias = diasAte(c.prazo_entrega as string);
      return {
        id: `entrega:${c.id}`,
        clientId: c.id,
        clientName: c.nome,
        cnpj: c.cnpj,
        cpf: c.cpf,
        consultantId: c.consultant_id,
        kind: "entrega" as const,
        mensagem: mensagemEntrega(dias),
        diasRestantes: dias,
      };
    });

  const itensAniversario: RotinaItem[] = (carteira ?? [])
    .filter((c) => c.aniversario_empresa)
    .map((c) => ({ client: c, info: calcularProximoAniversario(c.aniversario_empresa as string) }))
    .filter(({ info }) => info.diasRestantes <= 30)
    .map(({ client, info }) => ({
      id: `aniversario:${client.id}`,
      clientId: client.id,
      clientName: client.nome,
      cnpj: client.cnpj,
      cpf: client.cpf,
      consultantId: client.consultant_id,
      kind: "aniversario" as const,
      mensagem: `Aniversário de fundação em ${info.diasRestantes} dia${info.diasRestantes === 1 ? "" : "s"}`,
      diasRestantes: info.diasRestantes,
    }));

  const itensPedidoParado: RotinaItem[] = (carteira ?? [])
    .map((c) => ({
      client: c,
      bucket: bucketUltimoPedido(c.status, ultimoPedidoByClient.get(c.id) ?? null),
    }))
    .filter(({ bucket }) => bucket !== null)
    .map(({ client, bucket }) => ({
      id: `pedido_parado:${client.id}`,
      clientId: client.id,
      clientName: client.nome,
      cnpj: client.cnpj,
      cpf: client.cpf,
      consultantId: client.consultant_id,
      kind: "pedido_parado" as const,
      mensagem: PEDIDO_PARADO_LABEL[bucket as string],
      diasRestantes: -1,
    }));

  const itensNovoContato: RotinaItem[] = (novosContatos ?? []).map((c) => {
    const dias = diasDesde(c.created_at as string);
    return {
      id: `novo_contato:${c.id}`,
      clientId: c.id,
      clientName: c.nome,
      cnpj: c.cnpj,
      cpf: c.cpf,
      consultantId: c.consultant_id,
      kind: "novo_contato" as const,
      mensagem: mensagemNovoContato(dias),
      diasRestantes: -dias,
    };
  });

  // supabase-js sem tipos gerados do banco não sabe que client_action_items
  // → clients é N:1, então tipa o embed como array mesmo sendo sempre 0 ou 1.
  const itensAcao: RotinaItem[] = (acaoItens ?? [])
    .map((item) => ({ item, cliente: item.cliente?.[0] }))
    .filter(
      ({ cliente }) => cliente && (!escopo || cliente.consultant_id === escopo),
    )
    .map(({ item, cliente }) => ({
      id: `plano_acao:${item.id}`,
      clientId: item.client_id,
      clientName: cliente!.nome,
      cnpj: cliente!.cnpj,
      cpf: cliente!.cpf,
      consultantId: cliente!.consultant_id,
      kind: "plano_acao" as const,
      mensagem: item.descricao,
      diasRestantes: diasAte(item.data_prevista),
    }));

  return [
    ...itensEntrega,
    ...itensAniversario,
    ...itensPedidoParado,
    ...itensNovoContato,
    ...itensAcao,
  ]
    .filter((item) => bucketRotina(item.diasRestantes) !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}
