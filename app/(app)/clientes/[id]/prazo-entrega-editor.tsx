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
      <p className="text-xs uppercase text-zinc-500">
        Prazo previsto de entrega
      </p>
      <div className="mt-0.5 flex items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-md border border-chumbo/20 px-2 py-1 text-sm focus:border-brand focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-md bg-chumbo px-3 py-1 text-xs font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        {saved && <span className="text-xs text-green-700">Salvo!</span>}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {dias !== null && (
        <p
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            dias < 0
              ? "bg-red-100 text-red-800"
              : dias <= 3
                ? "bg-amber-100 text-amber-800"
                : "bg-zinc-100 text-zinc-600"
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
