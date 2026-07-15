import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paginate";
import { AvatarUpload } from "./avatar-upload";
import { MonthPicker } from "./month-picker";
import { GoalEditor } from "./goal-editor";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { id } = await params;
  const { mes: mesParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = viewerProfile?.role === "admin";
  const isSelf = id === user!.id;
  if (!isSelf && !isAdmin) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!profile) notFound();

  const today = new Date();
  const [ano, mes] = mesParam
    ? mesParam.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];
  const monthValue = `${ano}-${String(mes).padStart(2, "0")}`;

  const startDate = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const nextMes = mes === 12 ? 1 : mes + 1;
  const nextAno = mes === 12 ? ano + 1 : ano;
  const endDate = `${nextAno}-${String(nextMes).padStart(2, "0")}-01`;

  const [{ data: meta }, { data: clientRows }] = await Promise.all([
    supabase
      .from("metas_mensais")
      .select("*")
      .eq("consultant_id", id)
      .eq("ano", ano)
      .eq("mes", mes)
      .maybeSingle(),
    fetchAllRows((from, to) =>
      supabase
        .from("clients")
        .select("id, nome")
        .eq("consultant_id", id)
        .eq("na_carteira", true)
        .range(from, to),
    ),
  ]);

  const clientIds = (clientRows ?? []).map((c) => c.id);
  const clientNomeById = new Map((clientRows ?? []).map((c) => [c.id, c.nome]));
  const clientIdsSet = new Set(clientIds);

  // Sem .in() por lista de client_id de propósito — a mesma consulta filtrada
  // por URL já derrubou o dashboard uma vez com listas grandes (ver
  // app/(app)/page.tsx). Aqui a lista já é pequena (carteira de 1 consultor),
  // mas mantemos o padrão seguro e filtramos client-side.
  //
  // Busca paginada: acima do limite padrão de linhas do PostgREST (1000), um
  // único .select() sem range corta o restante silenciosamente.
  const [{ data: allOrders }, { data: allStats }] = clientIds.length
    ? await Promise.all([
        fetchAllRows((from, to) =>
          supabase
            .from("orders")
            .select("id, client_id, valor, data_pedido")
            .gte("data_pedido", startDate)
            .lt("data_pedido", endDate)
            .range(from, to),
        ),
        fetchAllRows((from, to) =>
          supabase.from("client_stats").select("client_id, pedidos").range(from, to),
        ),
      ])
    : [{ data: [] }, { data: [] }];

  const pedidosTotaisByClient = new Map(
    (allStats ?? [])
      .filter((s) => clientIdsSet.has(s.client_id))
      .map((s) => [s.client_id, s.pedidos]),
  );

  // Pedido de cliente novo (0 ou 1 pedido no total, somando histórico
  // importado + pedidos ao vivo) não conta na meta do consultor — é o
  // pedido de entrada do cliente na carteira, não uma venda recorrente.
  const orders = (allOrders ?? []).filter(
    (o) =>
      clientIdsSet.has(o.client_id) &&
      (pedidosTotaisByClient.get(o.client_id) ?? 0) > 1,
  );

  const totalPedidos = orders.length;
  const valorTotal = orders.reduce((sum, o) => sum + Number(o.valor), 0);
  const ticketMedio = totalPedidos > 0 ? valorTotal / totalPedidos : 0;

  const porClienteMap = new Map<
    string,
    { nome: string; pedidos: number; valor: number }
  >();
  for (const o of orders) {
    const atual = porClienteMap.get(o.client_id) ?? {
      nome: clientNomeById.get(o.client_id) ?? "—",
      pedidos: 0,
      valor: 0,
    };
    atual.pedidos += 1;
    atual.valor += Number(o.valor);
    porClienteMap.set(o.client_id, atual);
  }
  const porCliente = Array.from(porClienteMap.values()).sort(
    (a, b) => b.valor - a.valor,
  );

  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 60 * 60);
    avatarUrl = data?.signedUrl ?? null;
  }

  const valorMeta = Number(meta?.valor_meta ?? 0);
  const progresso = valorMeta > 0 ? Math.min(100, (valorTotal / valorMeta) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-6 rounded-lg border border-chumbo/10 bg-white p-6 shadow-sm sm:flex-row">
        <AvatarUpload
          profileId={profile.id}
          avatarUrl={avatarUrl}
          nome={profile.nome}
        />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-chumbo">{profile.nome}</h1>
          <p className="text-sm text-chumbo-light">
            @{profile.username}
            {profile.role === "admin" && " · admin"}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <MonthPicker profileId={profile.id} value={monthValue} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-chumbo-light">
                Meta do mês: {formatCurrency(valorMeta)}
              </span>
              <span className="font-medium text-chumbo">
                {formatCurrency(valorTotal)} vendido ({progresso.toFixed(0)}%)
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full bg-brand"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="mt-3">
              <GoalEditor
                profileId={profile.id}
                ano={ano}
                mes={mes}
                valorMeta={valorMeta}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              O primeiro pedido de um cliente novo (0 ou 1 pedido no total)
              não entra nessa conta — é a entrada dele na carteira, não uma
              venda recorrente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-chumbo-light">Pedidos no mês</p>
          <p className="mt-1 text-lg font-semibold text-chumbo">{totalPedidos}</p>
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-chumbo-light">Valor total</p>
          <p className="mt-1 text-lg font-semibold text-chumbo">
            {formatCurrency(valorTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-chumbo-light">Ticket médio</p>
          <p className="mt-1 text-lg font-semibold text-chumbo">
            {formatCurrency(ticketMedio)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {porCliente.map((c, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-zinc-900">{c.nome}</td>
                <td className="px-4 py-3 text-zinc-600">{c.pedidos}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatCurrency(c.valor)}
                </td>
              </tr>
            ))}
            {porCliente.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum pedido neste mês.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
