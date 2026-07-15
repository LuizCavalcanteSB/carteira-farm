import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import { fetchAllRows } from "@/lib/paginate";
import { ConsultorFilter } from "./consultor-filter";
import { ConfirmarContatoButton } from "./confirmar-button";

export default async function NovosContatosPage({
  searchParams,
}: {
  searchParams: Promise<{ consultor?: string }>;
}) {
  const { consultor } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const consultores = isAdmin
    ? (await supabase.from("profiles").select("id, nome").order("nome")).data ?? []
    : [];
  const consultorNomeById = new Map(consultores.map((c) => [c.id, c.nome]));

  let query = supabase
    .from("clients")
    .select("id, nome, cnpj, cpf, consultant_id, created_at")
    .eq("na_carteira", false)
    .order("created_at", { ascending: true });

  if (isAdmin && consultor) {
    query = query.eq("consultant_id", consultor);
  }

  const { data: clientes } = await fetchAllRows((from, to) =>
    query.range(from, to),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo">Novos contatos</h1>
          <p className="text-sm text-chumbo-light">
            Clientes cadastrados manualmente que ainda não entraram na
            carteira. Confirme o primeiro contato para eles aparecerem no
            dashboard normal.
          </p>
        </div>
        {isAdmin && (
          <ConsultorFilter defaultConsultor={consultor ?? ""} consultores={consultores} />
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">CNPJ/CPF</th>
              {isAdmin && <th className="px-4 py-3">Consultor</th>}
              <th className="px-4 py-3">Adicionado em</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(clientes ?? []).map((client) => (
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
                  {client.cnpj ? formatCnpj(client.cnpj) : formatCpf(client.cpf)}
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-zinc-600">
                    {consultorNomeById.get(client.consultant_id) ?? "—"}
                  </td>
                )}
                <td className="px-4 py-3 text-zinc-600">
                  {new Date(client.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <ConfirmarContatoButton clientId={client.id} />
                </td>
              </tr>
            ))}
            {(clientes ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  className="px-4 py-8 text-center text-zinc-400"
                >
                  Nenhum contato novo esperando confirmação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
