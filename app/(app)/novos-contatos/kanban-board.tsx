"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatCnpj } from "@/lib/cnpj";
import { formatCpf } from "@/lib/cpf";
import {
  ESTAGIOS_CONTATO,
  ESTAGIO_CONTATO_COLOR,
  ESTAGIO_CONTATO_LABEL,
  type EstagioContato,
} from "@/lib/kanban";
import { confirmarPrimeiroContato, moverEstagioContato } from "../contato-actions";

type Card = {
  id: string;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  consultantId: string;
  createdAt: string;
  estagio: EstagioContato;
};

const INCLUIR_NA_CARTEIRA = "incluir_na_carteira" as const;
type ColunaId = EstagioContato | typeof INCLUIR_NA_CARTEIRA;

export function KanbanBoard({
  initialCards,
  isAdmin,
  consultorNomeById,
}: {
  initialCards: Card[];
  isAdmin: boolean;
  consultorNomeById: Record<string, string>;
}) {
  const [cards, setCards] = useState(initialCards);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverColuna, setDragOverColuna] = useState<ColunaId | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function moverCard(clientId: string, destino: ColunaId) {
    const card = cards.find((c) => c.id === clientId);
    if (!card || card.estagio === destino) return;

    const cardsAnteriores = cards;
    setError(null);

    if (destino === INCLUIR_NA_CARTEIRA) {
      setCards((prev) => prev.filter((c) => c.id !== clientId));
      startTransition(async () => {
        const result = await confirmarPrimeiroContato(clientId);
        if (result?.error) {
          setError(result.error);
          setCards(cardsAnteriores);
        }
      });
      return;
    }

    setCards((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, estagio: destino } : c)),
    );
    startTransition(async () => {
      const result = await moverEstagioContato(clientId, destino);
      if (result?.error) {
        setError(result.error);
        setCards(cardsAnteriores);
      }
    });
  }

  const colunas: { id: ColunaId; label: string }[] = [
    ...ESTAGIOS_CONTATO.map((e) => ({ id: e, label: ESTAGIO_CONTATO_LABEL[e] })),
    { id: INCLUIR_NA_CARTEIRA, label: "Incluir na carteira" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="grid grid-cols-5 gap-3">
        {colunas.map((coluna) => {
          const cardsDaColuna =
            coluna.id === INCLUIR_NA_CARTEIRA
              ? []
              : cards.filter((c) => c.estagio === coluna.id);
          const isDropTarget = coluna.id === INCLUIR_NA_CARTEIRA;
          const isDraggedOver = dragOverColuna === coluna.id;

          return (
            <div
              key={coluna.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColuna(coluna.id);
              }}
              onDragLeave={() =>
                setDragOverColuna((prev) => (prev === coluna.id ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColuna(null);
                const clientId = e.dataTransfer.getData("text/plain");
                if (clientId) moverCard(clientId, coluna.id);
              }}
              className={`flex min-w-0 flex-col rounded-lg border transition-colors ${
                isDraggedOver
                  ? "border-brand bg-brand/10"
                  : isDropTarget
                    ? "border-dashed border-emerald-500/40 bg-emerald-500/10"
                    : "border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2 rounded-t-lg border-b border-chumbo/10 px-3 py-2 dark:border-white/10">
                {!isDropTarget && (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${ESTAGIO_CONTATO_COLOR[coluna.id as EstagioContato]}`}
                  />
                )}
                <span className="min-w-0 truncate text-sm font-semibold text-chumbo dark:text-white">
                  {coluna.label}
                </span>
                {!isDropTarget && (
                  <span className="ml-auto shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-chumbo dark:text-zinc-300">
                    {cardsDaColuna.length}
                  </span>
                )}
              </div>

              <div className="flex min-h-[120px] flex-col gap-2 p-2">
                {isDropTarget && cardsDaColuna.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-emerald-300">
                    Solte aqui para incluir na carteira
                  </p>
                )}
                {cardsDaColuna.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", card.id);
                      setDragId(card.id);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-md border border-chumbo/10 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-white/10 dark:bg-chumbo-light ${
                      dragId === card.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link
                      href={`/clientes/${card.id}`}
                      className="break-words font-medium text-chumbo hover:underline dark:text-white"
                    >
                      {card.nome}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {card.cnpj ? formatCnpj(card.cnpj) : formatCpf(card.cpf ?? "")}
                    </p>
                    {isAdmin && (
                      <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {consultorNomeById[card.consultantId] ?? "—"}
                      </p>
                    )}
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      Adicionado em{" "}
                      {new Date(card.createdAt).toLocaleDateString("pt-BR")}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        value={card.estagio}
                        disabled={isPending}
                        onChange={(e) =>
                          moverCard(card.id, e.target.value as EstagioContato)
                        }
                        className="w-full min-w-0 rounded-md border border-chumbo/20 bg-white px-1.5 py-1 text-xs text-chumbo focus:border-chumbo focus:outline-none disabled:opacity-50 dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
                      >
                        {ESTAGIOS_CONTATO.map((e) => (
                          <option key={e} value={e}>
                            {ESTAGIO_CONTATO_LABEL[e]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => moverCard(card.id, INCLUIR_NA_CARTEIRA)}
                        disabled={isPending}
                        className="ml-auto shrink-0 rounded-md bg-brand px-2 py-1 text-xs font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
                      >
                        Incluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
