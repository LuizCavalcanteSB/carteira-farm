import { createClient } from "@/lib/supabase/server";
import { buscarHistoricoNotificacoes } from "@/lib/notificacoes-feed";
import { ConsultorFilter } from "./consultor-filter";
import { HistoricoList } from "./historico-list";

export default async function NotificacoesPage({
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

  const historico = await buscarHistoricoNotificacoes(
    supabase,
    user!.id,
    isAdmin,
    consultor,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo dark:text-white">
            Histórico de notificações
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Tudo que já apareceu no sino: novos contatos, prazos de entrega e
            aniversários de empresa, visualizados ou não.
          </p>
        </div>
        {isAdmin && (
          <ConsultorFilter defaultConsultor={consultor ?? ""} consultores={consultores} />
        )}
      </div>

      <HistoricoList
        itens={historico}
        isAdmin={isAdmin}
        consultorNomeById={consultorNomeById}
      />
    </div>
  );
}
