import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj, onlyDigits } from "@/lib/cnpj";
import { SearchBar } from "./search-bar";
import type { ClientStatus } from "@/lib/types";

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospeccao: "Prospecção",
};

const STATUS_COLOR: Record<ClientStatus, string> = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-zinc-100 text-zinc-600",
  prospeccao: "bg-amber-100 text-amber-800",
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
    .select("id, nome, cnpj, status, segmento, consultant_id")
    .order("nome");

  if (q) {
    const digits = onlyDigits(q);
    query =
      digits.length >= 3
        ? query.or(`nome.ilike.%${q}%,cnpj.ilike.%${digits}%`)
        : query.ilike("nome", `%${q}%`);
  }

  if (isAdmin && consultor) {
    query = query.eq("consultant_id", consultor);
  }

  const { data: clients } = await query;

  const clientIds = (clients ?? []).map((c) => c.id);

  const [{ data: stats }, { data: notes }, { data: photos }] = clientIds.length
    ? await Promise.all([
        supabase
          .from("client_stats")
          .select("client_id, pedidos, total_comprado, ultimo_pedido")
          .in("client_id", clientIds),
        supabase.from("client_notes").select("client_id").in("client_id", clientIds),
        supabase.from("order_photos").select("client_id").in("client_id", clientIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

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
        <h1 className="text-2xl font-semibold text-chumbo">
          {isAdmin ? "Todas as carteiras" : "Minha carteira"}
        </h1>
        <p className="text-sm text-chumbo-light">
          Busque um cliente pelo nome ou CNPJ.
        </p>
      </div>

      <SearchBar
        defaultQuery={q ?? ""}
        consultores={isAdmin ? consultores ?? [] : undefined}
        defaultConsultor={consultor ?? ""}
        defaultOrdenar={ordenar}
      />

      <div className="overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3">Consultor</th>}
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Total comprado</th>
              <th className="px-4 py-3">Último pedido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {linhas.map(({ client, pedidos, totalComprado, ultimoPedido, incompleto }) => {
              return (
                <tr key={client.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clientes/${client.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {client.nome}
                      </Link>
                      {incompleto && (
                        <span
                          title="Faltam informações no perfil (pedidos, observações ou fotos)"
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        >
                          ⚠ incompleto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatCnpj(client.cnpj)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[client.status as ClientStatus]}`}
                    >
                      {STATUS_LABEL[client.status as ClientStatus]}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-zinc-600">
                      {consultorNomeById.get(client.consultant_id) ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-zinc-600">{pedidos}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatCurrency(totalComprado)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {ultimoPedido
                      ? new Date(ultimoPedido).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 6}
                  className="px-4 py-8 text-center text-zinc-400"
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
