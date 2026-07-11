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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; consultor?: string }>;
}) {
  const { q, consultor } = await searchParams;
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
  const { data: stats } = clientIds.length
    ? await supabase
        .from("client_stats")
        .select("client_id, pedidos, total_comprado")
        .in("client_id", clientIds)
    : { data: [] };

  const statsByClient = new Map(
    (stats ?? []).map((s) => [s.client_id, s]),
  );

  const consultorNomeById = new Map(
    (consultores ?? []).map((c) => [c.id, c.nome]),
  );

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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(clients ?? []).map((client) => {
              const stat = statsByClient.get(client.id);
              return (
                <tr key={client.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${client.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {client.nome}
                    </Link>
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
                  <td className="px-4 py-3 text-zinc-600">
                    {stat?.pedidos ?? 0}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatCurrency(stat?.total_comprado ?? 0)}
                  </td>
                </tr>
              );
            })}
            {(clients ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
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
