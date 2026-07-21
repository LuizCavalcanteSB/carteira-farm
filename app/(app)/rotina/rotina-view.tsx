"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import { ROTINA_GRUPO_LABEL, bucketRotina, type RotinaGrupo, type RotinaItem, type RotinaKind } from "@/lib/rotina";

type Periodo = "hoje" | "semana" | "mes";

const PERIODOS: { id: Periodo; label: string; grupos: RotinaGrupo[] }[] = [
  { id: "hoje", label: "Hoje", grupos: ["atrasado", "hoje"] },
  { id: "semana", label: "Esta semana", grupos: ["atrasado", "hoje", "semana"] },
  { id: "mes", label: "Este mês", grupos: ["atrasado", "hoje", "semana", "mes"] },
];

const TIPO_LABEL: Record<RotinaKind, string> = {
  entrega: "Prazo de entrega",
  aniversario: "Aniversário",
  pedido_parado: "Pedido parado",
  novo_contato: "Novo contato",
  plano_acao: "Plano de ação",
};

const GRUPO_ORDEM: RotinaGrupo[] = ["atrasado", "hoje", "semana", "mes"];

const GRUPO_DOT: Record<RotinaGrupo, string> = {
  atrasado: "bg-red-500",
  hoje: "bg-amber-500",
  semana: "bg-sky-500",
  mes: "bg-zinc-400",
};

const GRUPO_BORDA: Record<RotinaGrupo, string> = {
  atrasado: "border-l-red-500",
  hoje: "border-l-amber-500",
  semana: "border-l-sky-500",
  mes: "border-l-zinc-400",
};

function tag(item: RotinaItem) {
  if (item.kind === "pedido_parado") return "Parado";
  const dias = item.diasRestantes;
  if (dias < 0) return `${Math.abs(dias)}d atrás`;
  if (dias === 0) return "Hoje";
  return `${dias}d`;
}

const TAG_COLOR: Record<RotinaGrupo, string> = {
  atrasado: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  hoje: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  semana: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
  mes: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

export function RotinaView({
  items,
  isAdmin,
  consultorNomeById,
}: {
  items: RotinaItem[];
  isAdmin: boolean;
  consultorNomeById: Record<string, string>;
}) {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [tipo, setTipo] = useState<RotinaKind | "todos">("todos");

  const gruposPermitidos = PERIODOS.find((p) => p.id === periodo)!.grupos;

  const itensDoPeriodo = useMemo(
    () =>
      items.filter((item) => {
        const grupo = bucketRotina(item.diasRestantes);
        return grupo !== null && gruposPermitidos.includes(grupo);
      }),
    [items, gruposPermitidos],
  );

  const contagensPorTipo = useMemo(() => {
    const contagens: Partial<Record<RotinaKind, number>> = {};
    for (const item of itensDoPeriodo) {
      contagens[item.kind] = (contagens[item.kind] ?? 0) + 1;
    }
    return contagens;
  }, [itensDoPeriodo]);

  const itensFiltrados = useMemo(
    () => (tipo === "todos" ? itensDoPeriodo : itensDoPeriodo.filter((i) => i.kind === tipo)),
    [itensDoPeriodo, tipo],
  );

  const grupos = useMemo(() => {
    const porGrupo = new Map<RotinaGrupo, RotinaItem[]>();
    for (const item of itensFiltrados) {
      const grupo = bucketRotina(item.diasRestantes)!;
      if (!porGrupo.has(grupo)) porGrupo.set(grupo, []);
      porGrupo.get(grupo)!.push(item);
    }
    return GRUPO_ORDEM.filter((g) => gruposPermitidos.includes(g) && porGrupo.has(g)).map((g) => ({
      grupo: g,
      itens: porGrupo.get(g)!,
    }));
  }, [itensFiltrados, gruposPermitidos]);

  const totaisGlobais = useMemo(() => {
    const contagens: Record<RotinaGrupo, number> = { atrasado: 0, hoje: 0, semana: 0, mes: 0 };
    for (const item of items) {
      const grupo = bucketRotina(item.diasRestantes);
      if (grupo) contagens[grupo] += 1;
    }
    return contagens;
  }, [items]);

  const TIPOS_COM_ITENS = (Object.keys(TIPO_LABEL) as RotinaKind[]).filter(
    (k) => (contagensPorTipo[k] ?? 0) > 0 || tipo === k,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <ResumoCard label="Atrasados" value={totaisGlobais.atrasado} tone="red" />
        <ResumoCard label="Para hoje" value={totaisGlobais.hoje} tone="amber" />
        <ResumoCard label="Esta semana" value={totaisGlobais.semana} />
        <ResumoCard label="Total pendente" value={items.length} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              periodo === p.id
                ? "bg-brand text-chumbo"
                : "border border-chumbo/20 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-white/20 dark:bg-chumbo-light dark:text-zinc-300 dark:hover:bg-white/10"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTipo("todos")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            tipo === "todos"
              ? "bg-chumbo text-white dark:bg-white dark:text-chumbo"
              : "border border-chumbo/20 text-zinc-600 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
          }`}
        >
          Tudo <span className="opacity-70">({itensDoPeriodo.length})</span>
        </button>
        {TIPOS_COM_ITENS.map((k) => (
          <button
            key={k}
            onClick={() => setTipo(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tipo === k
                ? "bg-chumbo text-white dark:bg-white dark:text-chumbo"
                : "border border-chumbo/20 text-zinc-600 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
            }`}
          >
            {TIPO_LABEL[k]} <span className="opacity-70">({contagensPorTipo[k] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {grupos.map(({ grupo, itens }) => (
          <section key={grupo}>
            <div className="flex items-baseline gap-2 border-b border-chumbo/10 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              {ROTINA_GRUPO_LABEL[grupo]}
              <span className="font-normal text-zinc-400 dark:text-zinc-500">{itens.length}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {itens.map((item) => (
                <li
                  key={item.id}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border border-chumbo/10 border-l-4 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-chumbo-light ${GRUPO_BORDA[grupo]}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${GRUPO_DOT[grupo]}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link
                        href={`/clientes/${item.clientId}`}
                        className="truncate font-medium text-chumbo hover:underline dark:text-white"
                      >
                        {item.clientName}
                      </Link>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.cnpj ? formatCnpj(item.cnpj) : formatCpf(item.cpf ?? "")}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-medium">{TIPO_LABEL[item.kind]}</span> · {item.mensagem}
                      {isAdmin && (
                        <> · {consultorNomeById[item.consultantId] ?? "—"}</>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${TAG_COLOR[grupo]}`}>
                    {tag(item)}
                  </span>
                  <Link
                    href={`/clientes/${item.clientId}`}
                    className="shrink-0 rounded-md border border-chumbo/20 px-2.5 py-1 text-xs font-medium text-chumbo hover:border-brand hover:text-brand-dark dark:border-white/20 dark:text-white dark:hover:text-brand"
                  >
                    Ver cliente
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {grupos.length === 0 && (
          <p className="rounded-lg border border-chumbo/10 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
            Nada pendente por aqui. 🎉
          </p>
        )}
      </div>
    </div>
  );
}

function ResumoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "amber";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-600 dark:text-red-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-chumbo dark:text-white";

  return (
    <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
      <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
