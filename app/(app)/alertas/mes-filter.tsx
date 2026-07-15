"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MESES_LABEL } from "@/lib/alertas";

export function MesFilter({ defaultMes }: { defaultMes: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      value={defaultMes}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("mes", e.target.value);
        else params.delete("mes");
        router.push(`/alertas?${params.toString()}`);
      }}
      className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
    >
      <option value="">Alerta (próximos 60 dias)</option>
      {MESES_LABEL.map((label, i) => (
        <option key={label} value={String(i + 1)}>
          {label}
        </option>
      ))}
    </select>
  );
}
