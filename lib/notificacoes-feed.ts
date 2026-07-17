import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "./paginate";
import { limiteNotificacaoEntrega } from "./notifications";
import { calcularProximoAniversario, diasDesde } from "./alertas";

export type NotificationKind = "novo_contato" | "entrega" | "aniversario";

export type NotificationItem = {
  id: string;
  clientId: string;
  clientName: string;
  kind: NotificationKind;
  message: string;
  diasRestantes: number;
};

type RawItem = {
  consultantId: string;
  clientId: string;
  clientName: string;
  kind: NotificationKind;
  chave: string;
  mensagem: string;
  diasRestantes: number;
};

function diasRestantesEntrega(dataISO: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dataISO}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function mensagemEntrega(dias: number) {
  if (dias < 0) {
    return `Pedido atrasado há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`;
  }
  if (dias === 0) return "Pedido chega hoje";
  return `Pedido chega em ${dias} dia${dias === 1 ? "" : "s"}`;
}

function mensagemNovoContato(diasDesdeCriacao: number) {
  if (diasDesdeCriacao <= 0) return "Novo contato adicionado, aguardando abordagem";
  return `Aguardando primeiro contato há ${diasDesdeCriacao} dia${diasDesdeCriacao === 1 ? "" : "s"}`;
}

/** Calcula tudo que DEVERIA estar notificando agora, a partir do estado
 * atual dos clientes (não lê a tabela `notificacoes`). */
async function calcularItensAtivos(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
): Promise<RawItem[]> {
  let novoContatoQuery = supabase
    .from("clients")
    .select("id, nome, consultant_id, created_at")
    .eq("na_carteira", false)
    .eq("estagio_contato", "contato_novo");
  if (!isAdmin) novoContatoQuery = novoContatoQuery.eq("consultant_id", userId);
  const { data: novosContatos } = await fetchAllRows((from, to) =>
    novoContatoQuery.range(from, to),
  );

  let entregaQuery = supabase
    .from("clients")
    .select("id, nome, consultant_id, prazo_entrega")
    .not("prazo_entrega", "is", null)
    .lte("prazo_entrega", limiteNotificacaoEntrega());
  if (!isAdmin) entregaQuery = entregaQuery.eq("consultant_id", userId);
  const { data: entregas } = await fetchAllRows((from, to) =>
    entregaQuery.range(from, to),
  );

  let aniversarioQuery = supabase
    .from("clients")
    .select("id, nome, consultant_id, aniversario_empresa")
    .eq("na_carteira", true)
    .not("aniversario_empresa", "is", null);
  if (!isAdmin) aniversarioQuery = aniversarioQuery.eq("consultant_id", userId);
  const { data: aniversarios } = await fetchAllRows((from, to) =>
    aniversarioQuery.range(from, to),
  );

  const itensNovoContato: RawItem[] = (novosContatos ?? []).map((c) => {
    const dias = diasDesde(c.created_at as string);
    return {
      consultantId: c.consultant_id,
      clientId: c.id,
      clientName: c.nome,
      kind: "novo_contato",
      chave: `novo_contato:${c.id}`,
      mensagem: mensagemNovoContato(dias),
      diasRestantes: -dias,
    };
  });

  const itensEntrega: RawItem[] = (entregas ?? []).map((c) => {
    const dias = diasRestantesEntrega(c.prazo_entrega as string);
    return {
      consultantId: c.consultant_id,
      clientId: c.id,
      clientName: c.nome,
      kind: "entrega",
      chave: `entrega:${c.id}:${c.prazo_entrega}`,
      mensagem: mensagemEntrega(dias),
      diasRestantes: dias,
    };
  });

  const itensAniversario: RawItem[] = (aniversarios ?? [])
    .map((c) => ({
      client: c,
      info: calcularProximoAniversario(c.aniversario_empresa as string),
    }))
    .filter(({ info }) => info.tier !== null)
    .map(({ client, info }) => ({
      consultantId: client.consultant_id,
      clientId: client.id,
      clientName: client.nome,
      kind: "aniversario" as const,
      chave: `aniversario:${client.id}:${info.proximaData.getFullYear()}`,
      mensagem: `Aniversário de fundação em ${info.diasRestantes} dia${info.diasRestantes === 1 ? "" : "s"}`,
      diasRestantes: info.diasRestantes,
    }));

  return [...itensNovoContato, ...itensEntrega, ...itensAniversario];
}

/** Materializa os itens ativos na tabela `notificacoes` (cria os novos,
 * atualiza a mensagem dos que já existiam sem mexer em `lida_em`, e marca
 * como inativo qualquer notificação da mesma pessoa que não está mais na
 * lista atual — ex: prazo cumprido, contato confirmado). Roda a cada
 * carregamento de página; não depende de nenhum job agendado. */
async function sincronizarNotificacoes(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
  itensAtivos: RawItem[],
): Promise<Map<string, { id: string; lida_em: string | null }>> {
  const scopeConsultantIds = isAdmin
    ? ((await supabase.from("profiles").select("id")).data ?? []).map((p) => p.id)
    : [userId];

  let upsertados: { id: string; chave: string; lida_em: string | null }[] = [];
  if (itensAtivos.length > 0) {
    const { data } = await supabase
      .from("notificacoes")
      .upsert(
        itensAtivos.map((item) => ({
          consultant_id: item.consultantId,
          client_id: item.clientId,
          kind: item.kind,
          chave: item.chave,
          mensagem: item.mensagem,
          ativo: true,
        })),
        { onConflict: "consultant_id,chave" },
      )
      .select("id, chave, lida_em");
    upsertados = data ?? [];
  }

  const chavesAtivas = new Set(itensAtivos.map((item) => item.chave));
  const { data: existentesAtivas } = await supabase
    .from("notificacoes")
    .select("id, chave")
    .in("consultant_id", scopeConsultantIds)
    .eq("ativo", true);
  const idsParaDesativar = (existentesAtivas ?? [])
    .filter((row) => !chavesAtivas.has(row.chave))
    .map((row) => row.id);
  if (idsParaDesativar.length > 0) {
    await supabase.from("notificacoes").update({ ativo: false }).in("id", idsParaDesativar);
  }

  return new Map(upsertados.map((row) => [row.chave, { id: row.id, lida_em: row.lida_em }]));
}

/** Feed combinado (novo contato + prazo de entrega + aniversário de
 * empresa) pro sininho de notificações — só o que ainda está ativo e não
 * foi visualizado, ordenado do mais urgente pro menos urgente. */
export async function buildNotificationFeed(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
): Promise<NotificationItem[]> {
  const itensAtivos = await calcularItensAtivos(supabase, userId, isAdmin);
  const registros = await sincronizarNotificacoes(supabase, userId, isAdmin, itensAtivos);

  return itensAtivos
    .map((item) => {
      const registro = registros.get(item.chave);
      if (!registro || registro.lida_em) return null;
      return {
        id: registro.id,
        clientId: item.clientId,
        clientName: item.clientName,
        kind: item.kind,
        message: item.mensagem,
        diasRestantes: item.diasRestantes,
      };
    })
    .filter((item): item is NotificationItem => item !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);
}

export type HistoricoNotificacao = {
  id: string;
  clientId: string;
  clientName: string;
  consultantId: string;
  kind: NotificationKind;
  mensagem: string;
  ativo: boolean;
  lidaEm: string | null;
  createdAt: string;
};

/** Histórico completo (lidas e não lidas, ativas e já resolvidas) pra
 * página /notificacoes — diferente do sino, que só mostra o que está ativo
 * e ainda não foi visualizado. */
export async function buscarHistoricoNotificacoes(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
  consultorFiltro?: string,
): Promise<HistoricoNotificacao[]> {
  let query = supabase
    .from("notificacoes")
    .select("id, client_id, consultant_id, kind, mensagem, ativo, lida_em, created_at")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("consultant_id", userId);
  } else if (consultorFiltro) {
    query = query.eq("consultant_id", consultorFiltro);
  }

  const { data: registros } = await fetchAllRows((from, to) => query.range(from, to));
  if (!registros || registros.length === 0) return [];

  const clientIds = Array.from(new Set(registros.map((r) => r.client_id)));
  const { data: clientes } = await supabase
    .from("clients")
    .select("id, nome")
    .in("id", clientIds);
  const nomeByClientId = new Map((clientes ?? []).map((c) => [c.id, c.nome]));

  return registros.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: nomeByClientId.get(r.client_id) ?? "—",
    consultantId: r.consultant_id,
    kind: r.kind,
    mensagem: r.mensagem,
    ativo: r.ativo,
    lidaEm: r.lida_em,
    createdAt: r.created_at,
  }));
}
