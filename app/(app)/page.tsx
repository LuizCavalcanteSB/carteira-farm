import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj, onlyDigits } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import { formatDateOnly } from "@/lib/date";
import { fetchAllRows } from "@/lib/paginate";
import { SearchBar } from "./search-bar";
import { ContatoStatusSelect } from "./contato-status-select";
import type { ClientStatus, ContatoStatus } from "@/lib/types";

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospeccao: "Prospecção",
};

const STATUS_COLOR: Record<ClientStatus, string> = {
  ativo: "bg-green-500/15 text-green-400",
  inativo: "bg-white/10 text-zinc-300",
  prospeccao: "bg-amber-500/15 text-amber-400",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ORDENAR_OPCOES = ["nome", "pedidos", "valor", "ultimo_pedido"] as const;
type Ordenar = (typeof ORDENAR_OPCOES)[number];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; consultor?: string; ordenar?: string }>;
}) {
  const { q, consultor, ordenar: ordenarParam } = await searchParams;
  const ordenar: Ordenar = ORDENAR_OPCOES.includes(ordenarParam as Ordenar)
    ? (ordenarParam as Ordenar)
    : "nome";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, role")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const consultores = isAdmin
    ? (
        await supabase
          .from("profiles")
          .select("id, nome")
          .order("nome")
      ).data ?? []
    : [];

  let query = supabase
    .from("clients")
    .select(
      "id, nome, cnpj, cpf, status, segmento, consultant_id, contato_status",
    )
    // ainda não entrou de fato na carteira (lead novo aguardando o
    // primeiro contato) — ver /novos-contatos.
    .eq("na_carteira", true)
    .order("nome");

  if (q) {
    const digits = onlyDigits(q);
    query =
      digits.length >= 3
        ? query.or(
            `nome.ilike.%${q}%,cnpj.ilike.%${digits}%,cpf.ilike.%${digits}%`,
          )
        : query.ilike("nome", `%${q}%`);
  }

  if (isAdmin && consultor) {
    query = query.eq("consultant_id", consultor);
  }

  // fetchAllRows: mesma razão de sempre — sem paginação, o PostgREST corta
  // silenciosamente acima de 1000 linhas, travando a lista/contadores do
  // dashboard num teto de 1000 clientes mesmo com mais cadastrados.
  const { data: clients } = await fetchAllRows((from, to) =>
    query.range(from, to),
  );

  // Sem filtro por client_id aqui de propósito: a RLS de client_stats/
  // client_notes/order_photos já escopa pra só o que este usuário pode ver
  // (própria carteira, ou tudo se admin). Filtrar com .in() numa lista de
  // dezenas/centenas de UUIDs gera uma query string enorme que pode falhar.
  //
  // Busca paginada (fetchAllRows) em vez de um único .select() sem range:
  // o PostgREST tem um limite padrão de linhas por resposta (1000) — acima
  // disso o restante é cortado silenciosamente, fazendo clientes aleatórios
  // aparecerem com pedidos/observações/fotos zerados sem nenhum dado ter
  // sido realmente apagado.
  const [
    { data: stats, error: statsError },
    { data: notes, error: notesError },
    { data: photos, error: photosError },
  ] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from("client_stats")
        .select("client_id, pedidos, total_comprado, ultimo_pedido")
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase.from("client_notes").select("client_id").range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase.from("order_photos").select("client_id").range(from, to),
    ),
  ]);

  const statsErro = statsError || notesError || photosError;

  const statsByClient = new Map((stats ?? []).map((s) => [s.client_id, s]));

  const notesCountByClient = new Map<string, number>();
  for (const n of notes ?? []) {
    notesCountByClient.set(n.client_id, (notesCountByClient.get(n.client_id) ?? 0) + 1);
  }
  const photosCountByClient = new Map<string, number>();
  for (const p of photos ?? []) {
    photosCountByClient.set(p.client_id, (photosCountByClient.get(p.client_id) ?? 0) + 1);
  }

  const consultorNomeById = new Map(
    (consultores ?? []).map((c) => [c.id, c.nome]),
  );

  const linhas = (clients ?? []).map((client) => {
    const stat = statsByClient.get(client.id);
    return {
      client,
      pedidos: stat?.pedidos ?? 0,
      totalComprado: stat?.total_comprado ?? 0,
      ultimoPedido: stat?.ultimo_pedido ?? null,
      incompleto:
        (stat?.pedidos ?? 0) === 0 ||
        (notesCountByClient.get(client.id) ?? 0) === 0 ||
        (photosCountByClient.get(client.id) ?? 0) === 0,
    };
  });

  const totais = linhas.reduce(
    (acc, l) => ({
      clientes: acc.clientes + 1,
      pedidos: acc.pedidos + l.pedidos,
      valor: acc.valor + l.totalComprado,
      incompletos: acc.incompletos + (l.incompleto ? 1 : 0),
    }),
    { clientes: 0, pedidos: 0, valor: 0, incompletos: 0 },
  );

  linhas.sort((a, b) => {
    if (ordenar === "pedidos") return b.pedidos - a.pedidos;
    if (ordenar === "valor") return b.totalComprado - a.totalComprado;
    if (ordenar === "ultimo_pedido") {
      if (!a.ultimoPedido && !b.ultimoPedido) return 0;
      if (!a.ultimoPedido) return 1;
      if (!b.ultimoPedido) return -1;
      return (
        new Date(b.ultimoPedido).getTime() - new Date(a.ultimoPedido).getTime()
      );
    }
    return a.client.nome.localeCompare(b.client.nome);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {isAdmin ? "Todas as carteiras" : "Minha carteira"}
        </h1>
        <p className="text-sm text-zinc-400">
          Busque um cliente pelo nome, CNPJ ou CPF.
        </p>
      </div>

      <SearchBar
        defaultQuery={q ?? ""}
        consultores={isAdmin ? consultores ?? [] : undefined}
        defaultConsultor={consultor ?? ""}
        defaultOrdenar={ordenar}
      />

      {statsErro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Não foi possível carregar pedidos/total comprado/observações agora
          — os números abaixo podem estar incompletos. Atualize a página em
          instantes.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ResumoCard label="Clientes" value={String(totais.clientes)} />
        <ResumoCard label="Pedidos" value={String(totais.pedidos)} />
        <ResumoCard label="Total comprado" value={formatCurrency(totais.valor)} />
        <ResumoCard label="Incompletos" value={String(totais.incompletos)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-chumbo-light shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CNPJ/CPF</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3">Consultor</th>}
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Total comprado</th>
              <th className="px-4 py-3">Último pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {linhas.map(({ client, pedidos, totalComprado, ultimoPedido, incompleto }) => {
              return (
                <tr key={client.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="font-medium text-white hover:underline"
                      >
                        {client.nome}
                      </Link>
                      {incompleto && (
                        <span
                          title="Faltam informações no perfil (pedidos, observações ou fotos)"
                          className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400"
                        >
                          ⚠ incompleto
                        </span>
                      )}
                      <ContatoStatusSelect
                        clientId={client.id}
                        status={client.contato_status as ContatoStatus | null}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {client.cnpj ? formatCnpj(client.cnpj) : formatCpf(client.cpf)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[client.status as ClientStatus]}`}
                    >
                      {STATUS_LABEL[client.status as ClientStatus]}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-zinc-300">
                      {consultorNomeById.get(client.consultant_id) ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-zinc-300">{pedidos}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatCurrency(totalComprado)}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {ultimoPedido ? formatDateOnly(ultimoPedido) : "—"}
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResumoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
      <p className="text-xs uppercase text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
