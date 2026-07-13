import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateOnly } from "@/lib/date";
import { ConsultorFilter } from "./consultor-filter";
import { MimoForm } from "./mimo-form";
import { RemoverMimoButton } from "./remover-button";

function statusEnvio(dataEnvio: string | null) {
  if (!dataEnvio) return { label: "Sem data", cor: "bg-zinc-100 text-zinc-600" };
  const hoje = new Date().toISOString().slice(0, 10);
  if (dataEnvio < hoje) return { label: "Atrasado", cor: "bg-red-100 text-red-800" };
  if (dataEnvio === hoje) return { label: "Hoje", cor: "bg-amber-100 text-amber-800" };
  return { label: "Agendado", cor: "bg-green-100 text-green-800" };
}

export default async function MimosPage({
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

  let clientesQuery = supabase.from("clients").select("id, nome").order("nome");
  if (isAdmin && consultor) {
    clientesQuery = clientesQuery.eq("consultant_id", consultor);
  }
  const { data: clientes } = await clientesQuery;

  let mimosQuery = supabase
    .from("mimos")
    .select("id, observacao, data_envio, client:clients!inner(id, nome, consultant_id)")
    .order("data_envio", { ascending: true, nullsFirst: false });
  if (isAdmin && consultor) {
    mimosQuery = mimosQuery.eq("client.consultant_id", consultor);
  }
  const { data: mimos } = await mimosQuery;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo">Cadastro de Mimo</h1>
          <p className="text-sm text-chumbo-light">
            Agende presentes/brindes para seus clientes.
          </p>
        </div>
        {isAdmin && (
          <ConsultorFilter defaultConsultor={consultor ?? ""} consultores={consultores} />
        )}
      </div>

      <MimoForm clientes={clientes ?? []} />

      <div className="overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Observação</th>
              <th className="px-4 py-3">Data de envio</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(mimos ?? []).map((m) => {
              const cliente = Array.isArray(m.client) ? m.client[0] : m.client;
              const status = statusEnvio(m.data_envio);
              return (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${cliente?.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {cliente?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{m.observacao || "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {m.data_envio ? formatDateOnly(m.data_envio) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cor}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RemoverMimoButton mimoId={m.id} />
                  </td>
                </tr>
              );
            })}
            {(mimos ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum mimo cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
