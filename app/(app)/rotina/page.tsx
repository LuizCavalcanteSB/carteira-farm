import { createClient } from "@/lib/supabase/server";
import { buildRotinaItems } from "@/lib/rotina";
import { ConsultorFilter } from "./consultor-filter";
import { RotinaView } from "./rotina-view";

export default async function RotinaPage({
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

  const consultorNomeById = Object.fromEntries(consultores.map((c) => [c.id, c.nome]));

  const items = await buildRotinaItems(supabase, user!.id, isAdmin, consultor);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo dark:text-white">Rotina</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Prazos, aniversários, pedidos parados, novos contatos e o plano de
            ação — tudo que precisa da sua atenção, num só lugar.
          </p>
        </div>
        {isAdmin && (
          <ConsultorFilter defaultConsultor={consultor ?? ""} consultores={consultores} />
        )}
      </div>

      <RotinaView items={items} isAdmin={isAdmin} consultorNomeById={consultorNomeById} />
    </div>
  );
}
