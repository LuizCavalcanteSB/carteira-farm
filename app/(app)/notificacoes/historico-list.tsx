"use client";

import Link from "next/link";
import { Cake, ListChecks, PhoneCall, Truck } from "lucide-react";
import type { HistoricoNotificacao } from "@/lib/notificacoes-feed";
import { marcarNotificacaoLida } from "../notificacoes-actions";

const ICONE_POR_KIND = {
  entrega: Truck,
  novo_contato: PhoneCall,
  aniversario: Cake,
  plano_acao: ListChecks,
} as const;

const COR_POR_KIND = {
  entrega: "bg-brand/15 text-brand-dark dark:bg-brand/20 dark:text-brand",
  novo_contato: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  aniversario: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  plano_acao: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
} as const;

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoricoList({
  itens,
  isAdmin,
  consultorNomeById,
}: {
  itens: HistoricoNotificacao[];
  isAdmin: boolean;
  consultorNomeById: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-2">
      {itens.map((item) => {
        const Icone = ICONE_POR_KIND[item.kind];
        const lida = !!item.lidaEm;
        return (
          <Link
            key={item.id}
            href={`/clientes/${item.clientId}`}
            onClick={() => {
              if (!lida) void marcarNotificacaoLida(item.id);
            }}
            className="flex items-start gap-3 rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-chumbo-light dark:hover:bg-white/5"
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${COR_POR_KIND[item.kind]}`}
            >
              <Icone size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-chumbo dark:text-white">
                  {item.clientName}
                </span>
                {isAdmin && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {consultorNomeById[item.consultantId] ?? "—"}
                  </span>
                )}
                {!item.ativo && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    Resolvida
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-300">
                {item.mensagem}
              </span>
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                {formatarData(item.createdAt)}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                lida
                  ? "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400"
              }`}
            >
              {lida ? "Visualizada" : "Não visualizada"}
            </span>
          </Link>
        );
      })}
      {itens.length === 0 && (
        <p className="rounded-lg border border-chumbo/10 bg-white p-8 text-center text-zinc-500 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
          Nenhuma notificação por aqui ainda.
        </p>
      )}
    </div>
  );
}
