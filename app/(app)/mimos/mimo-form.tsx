"use client";

import { useRef, useState, useTransition } from "react";
import { adicionarMimo } from "./actions";

export function MimoForm({
  clientes,
}: {
  clientes: { id: string; nome: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          const result = await adicionarMimo(formData);
          if (result?.error) setError(result.error);
          else {
            setError(null);
            formRef.current?.reset();
          }
        })
      }
      className="flex flex-col gap-3 rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light sm:flex-row sm:items-end sm:flex-wrap"
    >
      <div className="flex flex-1 min-w-[200px] flex-col gap-1">
        <label className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Cliente</label>
        <select
          name="client_id"
          required
          defaultValue=""
          className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        >
          <option value="" disabled>
            Selecione o cliente...
          </option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-[2] min-w-[240px] flex-col gap-1">
        <label className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
          Observação (qual mimo será enviado)
        </label>
        <input
          type="text"
          name="observacao"
          placeholder="Ex: Caneca personalizada com o logo"
          className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
          Data de envio
        </label>
        <input
          type="date"
          name="data_envio"
          className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Adicionar mimo"}
      </button>

      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
