"use client";

import { useState, useTransition } from "react";
import { setAtivo } from "./actions";

export function AtivoButton({
  profileId,
  ativo,
}: {
  profileId: string;
  ativo: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const confirmMsg = ativo
      ? "Desativar o acesso desta pessoa? Ela não conseguirá mais fazer login até você reativar. Os dados dela não são apagados."
      : "Reativar o acesso desta pessoa? Ela volta a conseguir fazer login.";
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    startTransition(async () => {
      const result = await setAtivo(profileId, !ativo);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-50 ${
          ativo
            ? "border-red-200 text-red-700 hover:bg-red-50"
            : "border-chumbo/20 text-chumbo hover:bg-chumbo hover:text-brand"
        }`}
      >
        {isPending ? "Salvando..." : ativo ? "Desativar conta" : "Reativar conta"}
      </button>
      {error && <p className="max-w-[220px] text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
