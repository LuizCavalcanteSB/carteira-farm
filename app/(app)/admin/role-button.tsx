"use client";

import { useState, useTransition } from "react";
import { setRole } from "./actions";

export function RoleButton({
  profileId,
  currentRole,
}: {
  profileId: string;
  currentRole: "consultor" | "admin";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextRole = currentRole === "admin" ? "consultor" : "admin";

  function handleClick() {
    const confirmMsg =
      nextRole === "admin"
        ? "Promover esta pessoa a administrador? Ela passará a ver e editar a carteira de todo mundo."
        : "Rebaixar esta pessoa a consultor? Ela vai perder o acesso às outras carteiras.";
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    startTransition(async () => {
      const result = await setRole(profileId, nextRole);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-chumbo/20 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-brand hover:text-chumbo disabled:opacity-50 dark:border-white/20 dark:text-zinc-300"
      >
        {isPending
          ? "Salvando..."
          : nextRole === "admin"
            ? "Promover a admin"
            : "Rebaixar a consultor"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
