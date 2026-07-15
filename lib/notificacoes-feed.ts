import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "./paginate";
import { limiteNotificacaoEntrega } from "./notifications";
import { calcularProximoAniversario, diasDesde } from "./alertas";

export type NotificationItem = {
  clientId: string;
  clientName: string;
  kind: "novo_contato" | "entrega" | "aniversario";
  message: string;
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

/** Feed combinado (novo contato + prazo de entrega + aniversário de
 * empresa) pro sininho de notificações, ordenado do mais urgente pro
 * menos urgente. */
export async function buildNotificationFeed(
  supabase: SupabaseClient,
  userId: string,
  isAdmin: boolean,
): Promise<NotificationItem[]> {
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

  const itensNovoContato: NotificationItem[] = (novosContatos ?? []).map((c) => {
    const dias = diasDesde(c.created_at as string);
    return {
      clientId: c.id,
      clientName: c.nome,
      kind: "novo_contato",
      message: mensagemNovoContato(dias),
      diasRestantes: -dias,
    };
  });

  const itensEntrega: NotificationItem[] = (entregas ?? []).map((c) => {
    const dias = diasRestantesEntrega(c.prazo_entrega as string);
    return {
      clientId: c.id,
      clientName: c.nome,
      kind: "entrega",
      message: mensagemEntrega(dias),
      diasRestantes: dias,
    };
  });

  const itensAniversario: NotificationItem[] = (aniversarios ?? [])
    .map((c) => ({
      client: c,
      info: calcularProximoAniversario(c.aniversario_empresa as string),
    }))
    .filter(({ info }) => info.tier !== null)
    .map(({ client, info }) => ({
      clientId: client.id,
      clientName: client.nome,
      kind: "aniversario" as const,
      message: `Aniversário de fundação em ${info.diasRestantes} dia${info.diasRestantes === 1 ? "" : "s"}`,
      diasRestantes: info.diasRestantes,
    }));

  return [...itensNovoContato, ...itensEntrega, ...itensAniversario].sort(
    (a, b) => a.diasRestantes - b.diasRestantes,
  );
}
