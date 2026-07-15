"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ConsultorFilter({
  defaultConsultor,
  consultores,
}: {
  defaultConsultor: string;
  consultores: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      value={defaultConsultor}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("consultor", e.target.value);
        else params.delete("consultor");
        router.push(`/alertas?${params.toString()}`);
      }}
      className="rounded-md border border-white/20 bg-chumbo-light px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
    >
      <option value="">Todos os consultores</option>
      {consultores.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nome}
        </option>
      ))}
    </select>
  );
}
