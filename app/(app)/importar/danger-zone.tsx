"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { limparClientesDoConsultor } from "./actions";

type ConsultorComContagem = { id: string; nome: string; total: number };

export function DangerZone({
  consultores,
}: {
  consultores: ConsultorComContagem[];
}) {
  const [selecionado, setSelecionado] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const consultor = consultores.find((c) => c.id === selecionado);

  function handleClick() {
    if (!consultor) return;
    const confirmado = window.confirm(
      `Você tem certeza disto? Isso vai apagar os ${consultor.total} clientes da carteira de ${consultor.nome}, junto com os pedidos, observações e fotos deles. Essa ação não pode ser desfeita.`,
    );
    if (!confirmado) return;

    setError(null);
    startTransition(async () => {
      const result = await limparClientesDoConsultor(consultor.id);
      if (result?.error) {
        setError(result.error);
      } else {
        setSelecionado("");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-10 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <h2 className="text-sm font-semibold text-red-300">Zona de perigo</h2>
      <p className="mt-1 text-sm text-red-300">
        Apaga todos os clientes de um consultor específico — útil para limpar
        dados de teste antes de uma importação de verdade. Não tem volta.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <select
          value={selecionado}
          onChange={(e) => setSelecionado(e.target.value)}
          className="rounded-md border border-red-500/40 bg-chumbo-light px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
        >
          <option value="">Selecione o consultor...</option>
          {consultores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.total} cliente{c.total === 1 ? "" : "s"})
            </option>
          ))}
        </select>
        <button
          onClick={handleClick}
          disabled={isPending || !consultor || consultor.total === 0}
          className="rounded-md bg-chumbo-light px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
        >
          {isPending
            ? "Apagando..."
            : consultor
              ? `Apagar ${consultor.total} cliente(s) de ${consultor.nome}`
              : "Apagar clientes"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
