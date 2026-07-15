import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paginate";
import { ConsultorFilter } from "./consultor-filter";
import { KanbanBoard } from "./kanban-board";
import type { EstagioContato } from "@/lib/kanban";

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

  let query = supabase
    .from("clients")
    .select("id, nome, cnpj, cpf, consultant_id, created_at, estagio_contato")
    .eq("na_carteira", false)
    .order("created_at", { ascending: true });

  if (isAdmin && consultor) {
    query = query.eq("consultant_id", consultor);
  }

  const { data: clientes } = await fetchAllRows((from, to) =>
    query.range(from, to),
  );

  const consultorNomeById = Object.fromEntries(
    consultores.map((c) => [c.id, c.nome]),
  );

  const cards = (clientes ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    cnpj: c.cnpj,
    cpf: c.cpf,
    consultantId: c.consultant_id,
    createdAt: c.created_at,
    estagio: c.estagio_contato as EstagioContato,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo">Novos contatos</h1>
          <p className="text-sm text-chumbo-light">
            Acompanhe o processo do pedido de cada cliente novo. Arraste o
            card até &ldquo;Incluir na carteira&rdquo; quando ele passar a
            fazer parte da sua carteira normal.
          </p>
        </div>
        {isAdmin && (
          <ConsultorFilter defaultConsultor={consultor ?? ""} consultores={consultores} />
        )}
      </div>

      <KanbanBoard
        initialCards={cards}
        isAdmin={isAdmin}
        consultorNomeById={consultorNomeById}
      />
    </div>
  );
}
