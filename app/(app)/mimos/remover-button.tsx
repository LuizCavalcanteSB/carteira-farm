"use client";

import { useTransition } from "react";
import { removerMimo } from "./actions";

export function RemoverMimoButton({ mimoId }: { mimoId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => removerMimo(mimoId))}
      disabled={isPending}
      className="text-xs text-red-400 hover:underline disabled:opacity-50"
    >
      Remover
    </button>
  );
}
