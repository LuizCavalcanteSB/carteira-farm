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
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-4 overflow-x-auto pb-4">
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
              className={`flex w-72 shrink-0 flex-col rounded-lg border transition-colors ${
                isDraggedOver
                  ? "border-brand bg-brand/5"
                  : isDropTarget
                    ? "border-dashed border-emerald-300 bg-emerald-50/40"
                    : "border-chumbo/10 bg-zinc-50"
              }`}
            >
              <div className="flex items-center gap-2 rounded-t-lg border-b border-chumbo/10 px-3 py-2">
                {!isDropTarget && (
                  <span
                    className={`h-2 w-2 rounded-full ${ESTAGIO_CONTATO_COLOR[coluna.id as EstagioContato]}`}
                  />
                )}
                <span className="text-sm font-semibold text-chumbo">
                  {coluna.label}
                </span>
                {!isDropTarget && (
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500">
                    {cardsDaColuna.length}
                  </span>
                )}
              </div>

              <div className="flex min-h-[120px] flex-col gap-2 p-2">
                {isDropTarget && cardsDaColuna.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-emerald-700">
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
                    className={`cursor-grab rounded-md border border-chumbo/10 bg-white p-3 shadow-sm active:cursor-grabbing ${
                      dragId === card.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link
                      href={`/clientes/${card.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {card.nome}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {card.cnpj ? formatCnpj(card.cnpj) : formatCpf(card.cpf ?? "")}
                    </p>
                    {isAdmin && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {consultorNomeById[card.consultantId] ?? "—"}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-zinc-400">
                      Adicionado em{" "}
                      {new Date(card.createdAt).toLocaleDateString("pt-BR")}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={card.estagio}
                        disabled={isPending}
                        onChange={(e) =>
                          moverCard(card.id, e.target.value as EstagioContato)
                        }
                        className="rounded-md border border-chumbo/20 px-1.5 py-1 text-xs focus:border-brand focus:outline-none disabled:opacity-50"
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
                        className="ml-auto rounded-md bg-chumbo px-2 py-1 text-xs font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
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
