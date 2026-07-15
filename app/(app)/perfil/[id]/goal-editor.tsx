"use client";

import { useState, useTransition } from "react";
import { setMeta } from "./actions";

export function GoalEditor({
  profileId,
  ano,
  mes,
  valorMeta,
}: {
  profileId: string;
  ano: number;
  mes: number;
  valorMeta: number;
}) {
  const [value, setValue] = useState(String(valorMeta || ""));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const parsed = Number(value.replace(",", "."));
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Digite um valor válido.");
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setMeta(profileId, ano, mes, parsed);
      if (result?.error) setError(result.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-400">R$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-32 rounded-md border border-white/20 bg-chumbo-light px-2 py-1 text-sm text-white focus:border-brand focus:outline-none"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar meta"}
      </button>
      {saved && <span className="text-xs text-green-400">Salvo!</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
