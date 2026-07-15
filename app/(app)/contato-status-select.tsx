"use client";

import { useTransition } from "react";
import { atualizarContatoStatus } from "./contato-actions";
import {
  CONTATO_STATUS_COLOR,
  CONTATO_STATUS_OPTIONS,
  CONTATO_STATUS_SEM_REGISTRO_COLOR,
} from "@/lib/labels";
import type { ContatoStatus } from "@/lib/types";

export function ContatoStatusSelect({
  clientId,
  status,
}: {
  clientId: string;
  status: ContatoStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const cor = status ? CONTATO_STATUS_COLOR[status] : CONTATO_STATUS_SEM_REGISTRO_COLOR;

  return (
    <select
      value={status ?? ""}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const valor = e.target.value || null;
        startTransition(async () => {
          await atualizarContatoStatus(clientId, valor);
        });
      }}
      title="Registrar contato com este cliente"
      className={`shrink-0 rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 ${cor}`}
    >
      <option value="">Sem contato</option>
      {CONTATO_STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
