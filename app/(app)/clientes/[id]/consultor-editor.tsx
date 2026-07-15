"use client";

import { useState, useTransition } from "react";
import { reassignConsultant } from "./actions";

export function ConsultorEditor({
  clientId,
  consultantId,
  consultores,
}: {
  clientId: string;
  consultantId: string;
  consultores: { id: string; nome: string }[];
}) {
  const [value, setValue] = useState(consultantId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const nomeAtual = consultores.find((c) => c.id === consultantId)?.nome ?? "—";
  const nomeNovo = consultores.find((c) => c.id === value)?.nome ?? "—";

  function handleSave() {
    if (value === consultantId) return;
    const confirmado = window.confirm(
      `Migrar este cliente de "${nomeAtual}" para "${nomeNovo}"? Ele passa a contar na carteira e nas metas do novo consultor.`,
    );
    if (!confirmado) {
      setValue(consultantId);
      return;
    }

    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await reassignConsultant(clientId, value);
      if (result?.error) {
        setError(result.error);
        setValue(consultantId);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="min-w-0">
      <p className="text-xs uppercase text-zinc-500">Consultor responsável</p>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          className="w-full min-w-0 truncate rounded-md border border-chumbo/20 px-2 py-1 text-sm focus:border-brand focus:outline-none disabled:opacity-50 sm:w-auto"
        >
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        {value !== consultantId && (
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-chumbo px-3 py-1 text-xs font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
          >
            {isPending ? "Migrando..." : "Migrar"}
          </button>
        )}
        {saved && <span className="text-xs text-green-700">Migrado!</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
