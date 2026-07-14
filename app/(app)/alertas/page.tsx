import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/cnpj";
import { formatDateOnly } from "@/lib/date";
import {
  ANIVERSARIO_SEM_ALERTA_COLOR,
  ANIVERSARIO_TIER_COLOR,
  bucketUltimoPedido,
  calcularProximoAniversario,
  MESES_LABEL,
  PERIODO_PEDIDO_LABEL,
  type PeriodoPedido,
} from "@/lib/alertas";
import { fetchAllRows } from "@/lib/paginate";
import { ConsultorFilter } from "./consultor-filter";
import { MesFilter } from "./mes-filter";

const PERIODOS: PeriodoPedido[] = ["1", "3", "6", "sem_pedido"];

export default async function AlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; consultor?: string; mes?: string }>;
}) {
  const { periodo: periodoParam, consultor, mes: mesParam } = await searchParams;
  const periodo: PeriodoPedido = PERIODOS.includes(periodoParam as PeriodoPedido)
    ? (periodoParam as PeriodoPedido)
    : "1";
  const mes = mesParam && /^([1-9]|1[0-2])$/.test(mesParam) ? Number(mesParam) : null;

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

  let clientQuery = supabase
    .from("clients")
    .select("id, nome, cnpj, status, consultant_id, aniversario_empresa")
    .order("nome");

  if (isAdmin && consultor) {
    clientQuery = clientQuery.eq("consultant_id", consultor);
  }

  const { data: clients } = await fetchAllRows((from, to) =>
    clientQuery.range(from, to),
  );
  const clientIds = new Set((clients ?? []).map((c) => c.id));

  // Sem .in() por lista de client_id — a mesma consulta filtrada por URL já
  // zerou o dashboard uma vez com listas grandes (ver app/(app)/page.tsx). A
  // RLS de client_stats já escopa pra só o que este usuário pode ver.
  //
  // Busca paginada: acima do limite padrão de linhas do PostgREST (1000),
  // um único .select() sem range corta o restante silenciosamente.
  const { data: allStats } = await fetchAllRows((from, to) =>
    supabase.from("client_stats").select("client_id, ultimo_pedido").range(from, to),
  );

  const ultimoPedidoByClient = new Map(
    (allStats ?? [])
      .filter((s) => clientIds.has(s.client_id))
      .map((s) => [s.client_id, s.ultimo_pedido]),
  );

  const linhasPedidos = (clients ?? [])
    .map((client) => {
      const ultimoPedido = ultimoPedidoByClient.get(client.id) ?? null;
      const bucket = bucketUltimoPedido(client.status, ultimoPedido);
      return { client, ultimoPedido, bucket };
    })
    .filter((l) => l.bucket === periodo);

  const contagens = Object.fromEntries(
    PERIODOS.map((p) => [
      p,
      (clients ?? []).filter(
        (c) =>
          bucketUltimoPedido(c.status, ultimoPedidoByClient.get(c.id) ?? null) === p,
      ).length,
    ]),
  );

  const aniversariosTodos = (clients ?? [])
    .filter((c) => c.aniversario_empresa)
    .map((client) => ({
      client,
      info: calcularProximoAniversario(client.aniversario_empresa as string),
    }));

  const linhasAniversario = mes
    ? aniversariosTodos
        .filter((l) => l.info.mes === mes)
        .sort((a, b) => a.info.dia - b.info.dia)
    : aniversariosTodos
        .filter((l) => l.info.tier !== null)
        .sort((a, b) => a.info.diasRestantes - b.info.diasRestantes);

  function hrefComPeriodo(p: PeriodoPedido) {
    const params = new URLSearchParams();
    if (isAdmin && consultor) params.set("consultor", consultor);
    if (mes) params.set("mes", String(mes));
    params.set("periodo", p);
    return `?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-chumbo">Alertas</h1>
        <p className="text-sm text-chumbo-light">
          Clientes que precisam de atenção: sem pedido recente ou com
          aniversário de empresa chegando.
        </p>
      </div>

      {isAdmin && (
        <ConsultorFilter
          defaultConsultor={consultor ?? ""}
          consultores={consultores}
        />
      )}

      <section>
        <h2 className="text-lg font-semibold text-chumbo">Pedidos parados</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={hrefComPeriodo(p)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                periodo === p
                  ? "bg-chumbo text-brand"
                  : "border border-chumbo/20 bg-white text-chumbo hover:bg-zinc-50"
              }`}
            >
              {PERIODO_PEDIDO_LABEL[p]} ({contagens[p] ?? 0})
            </Link>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">CNPJ</th>
                {isAdmin && <th className="px-4 py-3">Consultor</th>}
                <th className="px-4 py-3">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {linhasPedidos.map(({ client, ultimoPedido }) => (
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
                  {isAdmin && (
                    <td className="px-4 py-3 text-zinc-600">
                      {consultorNomeById.get(client.consultant_id) ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-zinc-600">
                    {ultimoPedido ? formatDateOnly(ultimoPedido) : "—"}
                  </td>
                </tr>
              ))}
              {linhasPedidos.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-8 text-center text-zinc-400"
                  >
                    Nenhum cliente nessa faixa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-chumbo">
              Aniversários de empresa {mes ? `em ${MESES_LABEL[mes - 1]}` : "próximos"}
            </h2>
            <p className="text-sm text-chumbo-light">
              {mes
                ? `Todos os clientes com aniversário de fundação em ${MESES_LABEL[mes - 1]}, em qualquer ano.`
                : "Clientes com aniversário de fundação nos próximos 60 dias."}
            </p>
          </div>
          <MesFilter defaultMes={mes ? String(mes) : ""} />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                {isAdmin && <th className="px-4 py-3">Consultor</th>}
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Faltam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {linhasAniversario.map(({ client, info }) => (
                <tr key={client.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/clientes/${client.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {client.nome}
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-zinc-600">
                      {consultorNomeById.get(client.consultant_id) ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-zinc-600">
                    {info.proximaData.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        info.tier ? ANIVERSARIO_TIER_COLOR[info.tier] : ANIVERSARIO_SEM_ALERTA_COLOR
                      }`}
                    >
                      {info.diasRestantes} dia{info.diasRestantes === 1 ? "" : "s"}
                    </span>
                  </td>
                </tr>
              ))}
              {linhasAniversario.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-8 text-center text-zinc-400"
                  >
                    {mes
                      ? `Nenhum cliente com aniversário em ${MESES_LABEL[mes - 1]}.`
                      : "Nenhum aniversário nos próximos 60 dias."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
