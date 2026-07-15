"use client";

import { useState, useTransition } from "react";
import { setPrazoEntrega } from "./actions";

function diasRestantes(data: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function PrazoEntregaEditor({
  clientId,
  prazoEntrega,
}: {
  clientId: string;
  prazoEntrega: string | null;
}) {
  const [value, setValue] = useState(prazoEntrega ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dias = value ? diasRestantes(value) : null;

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setPrazoEntrega(clientId, value);
      if (result?.error) setError(result.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div>
      <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
        Prazo previsto de entrega
      </p>
      <div className="mt-0.5 flex items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-md border border-chumbo/20 bg-white px-2 py-1 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-xs text-green-600 dark:text-green-400">Salvo!</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {dias !== null && (
        <p
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            dias < 0
              ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
              : dias <= 3
                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
          }`}
        >
          {dias < 0
            ? `Atrasado há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`
            : dias === 0
              ? "Chega hoje"
              : `Faltam ${dias} dia${dias === 1 ? "" : "s"}`}
        </p>
      )}
    </div>
  );
}
