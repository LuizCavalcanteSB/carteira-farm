"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBar({
  defaultQuery,
  defaultConsultor,
  defaultOrdenar,
  defaultAlerta,
  consultores,
}: {
  defaultQuery: string;
  defaultConsultor: string;
  defaultOrdenar: string;
  defaultAlerta: string;
  consultores?: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(defaultQuery);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateParams({ q });
      }}
      className="flex gap-3"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nome ou CNPJ..."
        className="w-full max-w-md rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand hover:bg-chumbo-light"
      >
        Buscar
      </button>

      {consultores && (
        <select
          value={defaultConsultor}
          onChange={(e) => updateParams({ consultor: e.target.value })}
          className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
        >
          <option value="">Todos os consultores</option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      )}

      <select
        value={defaultOrdenar}
        onChange={(e) => updateParams({ ordenar: e.target.value })}
        className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
      >
        <option value="nome">Ordenar por nome</option>
        <option value="pedidos">Mais pedidos</option>
        <option value="valor">Maior valor comprado</option>
        <option value="ultimo_pedido">Último pedido mais recente</option>
      </select>

      <select
        value={defaultAlerta}
        onChange={(e) => updateParams({ alerta: e.target.value })}
        className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
      >
        <option value="">Todos os alertas</option>
        <option value="30">Pedido há 30+ dias</option>
        <option value="60">Pedido há 60+ dias</option>
        <option value="90">Pedido há 90+ dias</option>
        <option value="sem_pedido">Sem pedidos registrados</option>
      </select>
    </form>
  );
}
