import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj, onlyDigits } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import { formatDateOnly } from "@/lib/date";
import { fetchAllRows } from "@/lib/paginate";
import { urgenciaPedido, type UrgenciaTom } from "@/lib/alertas";
import { corDoAvatar, iniciaisDoNome } from "@/lib/avatar";
import { SearchBar } from "./search-bar";
import { ContatoStatusSelect } from "./contato-status-select";
import type { ClientStatus, ContatoStatus } from "@/lib/types";

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospeccao: "Prospecção",
};

const STATUS_COLOR: Record<ClientStatus, string> = {
  ativo: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  inativo: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  prospeccao: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
};

const TOM_BORDA: Record<UrgenciaTom, string> = {
  red: "border-l-red-500",
  orange: "border-l-orange-500",
  amber: "border-l-amber-500",
  emerald: "border-l-emerald-500",
  muted: "border-l-transparent",
};

const TOM_TEXTO: Record<UrgenciaTom, string> = {
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
  amber: "text-amber-600 dark:text-amber-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  muted: "text-zinc-500 dark:text-zinc-400",
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

  // Mesmos filtros de carteira/consultor aplicados direto na view — em vez
  // de baixar client_notes/order_photos inteiras (todos os clientes, de
  // todos os consultores) só pra checar "tem pelo menos 1?", a view já traz
  // isso pronto em tem_observacao/tem_foto (ver supabase/schema.sql). Não
  // repete o filtro de busca (q): os totais precisam cobrir toda a carteira
  // do consultor, não só os resultados filtrados por nome/CNPJ.
  let statsQuery = supabase
    .from("client_stats")
    .select("client_id, pedidos, total_comprado, ultimo_pedido, tem_observacao, tem_foto")
    .eq("na_carteira", true);

  if (isAdmin && consultor) {
    statsQuery = statsQuery.eq("consultant_id", consultor);
  }

  // fetchAllRows: mesma razão de sempre — sem paginação, o PostgREST corta
  // silenciosamente acima de 1000 linhas, travando a lista/contadores do
  // dashboard num teto de 1000 clientes mesmo com mais cadastrados. As duas
  // buscas não dependem uma da outra, então rodam em paralelo.
  const [{ data: clients }, { data: stats, error: statsError }] = await Promise.all([
    fetchAllRows((from, to) => query.range(from, to)),
    fetchAllRows((from, to) => statsQuery.range(from, to)),
  ]);

  const statsErro = statsError;

  const statsByClient = new Map((stats ?? []).map((s) => [s.client_id, s]));

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
        (stat?.pedidos ?? 0) === 0 || !stat?.tem_observacao || !stat?.tem_foto,
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
        <h1 className="text-2xl font-semibold text-chumbo dark:text-white">
          {isAdmin ? "Todas as carteiras" : "Minha carteira"}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
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

      <div className="hidden items-center gap-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-zinc-400 md:flex dark:text-zinc-500">
        <span className="min-w-0 flex-1 pl-[50px]">Cliente</span>
        <span className="w-28 shrink-0">Segmento</span>
        <span className="w-24 shrink-0">Status</span>
        {isAdmin && <span className="w-32 shrink-0">Consultor</span>}
        <span className="w-16 shrink-0 text-right">Pedidos</span>
        <span className="w-28 shrink-0 text-right">Total</span>
        <span className="w-32 shrink-0 text-right">Último pedido</span>
      </div>

      <div className="flex flex-col gap-2">
        {linhas.map(({ client, pedidos, totalComprado, ultimoPedido, incompleto }) => {
          const urgencia = urgenciaPedido(client.status, ultimoPedido);
          return (
            <div
              key={client.id}
              className={`flex flex-wrap items-center gap-3.5 rounded-lg border border-chumbo/10 border-l-4 bg-white p-3 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-chumbo-light dark:hover:bg-white/5 ${TOM_BORDA[urgencia.tom]}`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${corDoAvatar(client.nome)}`}
              >
                {iniciaisDoNome(client.nome)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/clientes/${client.id}`}
                    className="truncate font-medium text-chumbo hover:underline dark:text-white"
                  >
                    {client.nome}
                  </Link>
                  {incompleto && (
                    <span
                      title="Faltam informações no perfil (pedidos, observações ou fotos)"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                    />
                  )}
                  <ContatoStatusSelect
                    clientId={client.id}
                    status={client.contato_status as ContatoStatus | null}
                  />
                </div>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {client.cnpj ? formatCnpj(client.cnpj) : formatCpf(client.cpf)}
                </p>
              </div>

              <span className="hidden w-28 shrink-0 truncate text-xs text-zinc-500 md:block dark:text-zinc-400">
                {client.segmento || "—"}
              </span>

              <span className="w-24 shrink-0">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[client.status as ClientStatus]}`}
                >
                  {STATUS_LABEL[client.status as ClientStatus]}
                </span>
              </span>

              {isAdmin && (
                <span className="hidden w-32 shrink-0 truncate text-xs text-zinc-500 md:block dark:text-zinc-400">
                  {consultorNomeById.get(client.consultant_id) ?? "—"}
                </span>
              )}

              <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-chumbo dark:text-white">
                {pedidos}
              </span>
              <span className="w-28 shrink-0 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                {formatCurrency(totalComprado)}
              </span>
              <span className="w-32 shrink-0 text-right">
                <span className={`block text-sm font-semibold ${TOM_TEXTO[urgencia.tom]}`}>
                  {ultimoPedido ? urgencia.label : "—"}
                </span>
                {ultimoPedido && (
                  <span className="block text-xs tabular-nums text-zinc-400">
                    {formatDateOnly(ultimoPedido)}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {linhas.length === 0 && (
          <p className="rounded-lg border border-chumbo/10 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
            Nenhum cliente encontrado.
          </p>
        )}
      </div>
    </div>
  );
}

function ResumoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
      <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-chumbo dark:text-white">{value}</p>
    </div>
  );
}
