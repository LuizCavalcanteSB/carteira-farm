import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paginate";
import { limiteNotificacaoEntrega } from "@/lib/notifications";
import { ConsultorFilter } from "./consultor-filter";
import { NotificationSound } from "./notification-sound";

function diasRestantes(data: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

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
  const consultorNomeById = new Map(consultores.map((c) => [c.id, c.nome]));

  let query = supabase
    .from("clients")
    .select("id, nome, consultant_id, prazo_entrega")
    .not("prazo_entrega", "is", null)
    .lte("prazo_entrega", limiteNotificacaoEntrega())
    .order("prazo_entrega", { ascending: true });

  if (isAdmin && consultor) {
    query = query.eq("consultant_id", consultor);
  }

  const { data: clientes } = await fetchAllRows((from, to) =>
    query.range(from, to),
  );

  const notificacoes = (clientes ?? []).map((c) => ({
    ...c,
    dias: diasRestantes(c.prazo_entrega as string),
  }));

  return (
    <div className="flex flex-col gap-6">
      <NotificationSound tocar={notificacoes.length > 0} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo">Notificações</h1>
          <p className="text-sm text-chumbo-light">
            Pedidos com entrega prevista em até 3 dias, ou já atrasados.
          </p>
        </div>
        {isAdmin && (
          <ConsultorFilter defaultConsultor={consultor ?? ""} consultores={consultores} />
        )}
      </div>

      <div className="flex flex-col gap-2">
        {notificacoes.map((n) => (
          <Link
            key={n.id}
            href={`/clientes/${n.id}`}
            className="flex items-center justify-between rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm hover:bg-zinc-50"
          >
            <div>
              <p className="font-medium text-zinc-900">{n.nome}</p>
              {isAdmin && (
                <p className="text-xs text-zinc-500">
                  {consultorNomeById.get(n.consultant_id) ?? "—"}
                </p>
              )}
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                n.dias < 0
                  ? "bg-red-100 text-red-800"
                  : n.dias <= 3
                    ? "bg-amber-100 text-amber-800"
                    : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {n.dias < 0
                ? `Atrasado há ${Math.abs(n.dias)} dia${Math.abs(n.dias) === 1 ? "" : "s"}`
                : n.dias === 0
                  ? "Chega hoje"
                  : `Faltam ${n.dias} dia${n.dias === 1 ? "" : "s"}`}
            </span>
          </Link>
        ))}
        {notificacoes.length === 0 && (
          <p className="rounded-lg border border-chumbo/10 bg-white p-8 text-center text-zinc-400 shadow-sm">
            Nenhuma notificação no momento.
          </p>
        )}
      </div>
    </div>
  );
}
