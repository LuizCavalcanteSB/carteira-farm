"use client";

import { useState, useTransition } from "react";
import { confirmarPrimeiroContato } from "../contato-actions";

export function ConfirmarContatoButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await confirmarPrimeiroContato(clientId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-chumbo px-3 py-1.5 text-xs font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
      >
        {isPending ? "Confirmando..." : "Contato realizado"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
