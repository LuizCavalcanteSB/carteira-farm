"use client";

import { useState, useTransition } from "react";
import { setAniversario } from "./actions";
import { ANIVERSARIO_TIER_COLOR, calcularProximoAniversario } from "@/lib/alertas";

export function BirthdayEditor({
  clientId,
  aniversarioEmpresa,
}: {
  clientId: string;
  aniversarioEmpresa: string | null;
}) {
  const [value, setValue] = useState(aniversarioEmpresa ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const info = value ? calcularProximoAniversario(value) : null;

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setAniversario(clientId, value);
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
        Data de aniversário da empresa
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
      {info?.tier && (
        <p
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ANIVERSARIO_TIER_COLOR[info.tier]}`}
        >
          🎂 Aniversário em {info.diasRestantes} dia
          {info.diasRestantes === 1 ? "" : "s"} (
          {info.proximaData.toLocaleDateString("pt-BR")})
        </p>
      )}
    </div>
  );
}
