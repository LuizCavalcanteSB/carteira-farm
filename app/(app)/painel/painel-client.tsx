"use client";

import { useState, useTransition } from "react";
import { salvarCampoConsultor, salvarMetaGlobal } from "./actions";

type Linha = {
  consultant_id: string;
  nome: string;
  meta_individual: number;
  vtv: number;
  quantidade_vendas: number;
  ligacoes: number;
};

type CampoNumerico = "meta_individual" | "vtv" | "quantidade_vendas" | "ligacoes";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDataExtenso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PainelDiarioClient({
  data,
  metaGlobal: metaGlobalInicial,
  linhas: linhasIniciais,
}: {
  data: string;
  metaGlobal: number;
  linhas: Linha[];
}) {
  const [metaGlobal, setMetaGlobal] = useState(metaGlobalInicial);
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function atualizarLinha(
    consultantId: string,
    campo: CampoNumerico,
    valorBruto: number,
  ) {
    const valor =
      campo === "quantidade_vendas" || campo === "ligacoes"
        ? Math.round(valorBruto)
        : valorBruto;

    setLinhas((prev) =>
      prev.map((l) =>
        l.consultant_id === consultantId ? { ...l, [campo]: valor } : l,
      ),
    );
    startTransition(async () => {
      const result = await salvarCampoConsultor(consultantId, data, campo, valor);
      setErro(
        result?.error
          ? `Não foi possível salvar: ${result.error}`
          : null,
      );
    });
  }

  function atualizarMetaGlobal(valor: number) {
    setMetaGlobal(valor);
    startTransition(async () => {
      const result = await salvarMetaGlobal(data, valor);
      setErro(
        result?.error
          ? `Não foi possível salvar: ${result.error}`
          : null,
      );
    });
  }

  const totalVendas = linhas.reduce((s, l) => s + l.quantidade_vendas, 0);
  const vtvTotal = linhas.reduce((s, l) => s + l.vtv, 0);
  const ligacoesTotal = linhas.reduce((s, l) => s + l.ligacoes, 0);
  const ticketMedio = totalVendas > 0 ? vtvTotal / totalVendas : 0;
  const falta = metaGlobal - vtvTotal;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-chumbo">Painel do dia</h1>
        <p className="text-sm text-chumbo-light">
          {formatDataExtenso(data)} · visível e editável por todo o time.
        </p>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Total de vendas</p>
          <p className="mt-1 text-xl font-semibold text-chumbo">{totalVendas}</p>
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">VTV do dia</p>
          <p className="mt-1 text-xl font-semibold text-chumbo">
            {formatCurrency(vtvTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Meta diária (time)</p>
          <input
            type="number"
            step="0.01"
            min="0"
            defaultValue={metaGlobal || ""}
            onBlur={(e) => atualizarMetaGlobal(Number(e.target.value) || 0)}
            className="mt-1 w-full rounded-md border border-chumbo/20 px-2 py-1 text-lg font-semibold text-chumbo focus:border-brand focus:outline-none"
          />
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Falta para a meta</p>
          <p
            className={`mt-1 text-xl font-semibold ${
              falta > 0 ? "text-chumbo" : "text-green-700"
            }`}
          >
            {falta > 0 ? formatCurrency(falta) : "Meta batida! 🎉"}
          </p>
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Ticket médio</p>
          <p className="mt-1 text-xl font-semibold text-chumbo">
            {totalVendas > 0 ? formatCurrency(ticketMedio) : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-zinc-500">Ligações</p>
          <p className="mt-1 text-xl font-semibold text-chumbo">{ligacoesTotal}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-chumbo/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Consultor</th>
              <th className="px-4 py-3">Meta individual</th>
              <th className="px-4 py-3">VTV (vendido)</th>
              <th className="px-4 py-3">Qtd. vendas</th>
              <th className="px-4 py-3">Ticket médio</th>
              <th className="px-4 py-3">Ligações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {linhas.map((l) => {
              const tm = l.quantidade_vendas > 0 ? l.vtv / l.quantidade_vendas : 0;
              return (
                <tr key={l.consultant_id}>
                  <td className="px-4 py-2 font-medium text-zinc-900">{l.nome}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={l.meta_individual || ""}
                      onBlur={(e) =>
                        atualizarLinha(
                          l.consultant_id,
                          "meta_individual",
                          Number(e.target.value) || 0,
                        )
                      }
                      className="w-28 rounded-md border border-chumbo/20 px-2 py-1 focus:border-brand focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={l.vtv || ""}
                      onBlur={(e) =>
                        atualizarLinha(l.consultant_id, "vtv", Number(e.target.value) || 0)
                      }
                      className="w-28 rounded-md border border-chumbo/20 px-2 py-1 focus:border-brand focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={l.quantidade_vendas || ""}
                      onBlur={(e) =>
                        atualizarLinha(
                          l.consultant_id,
                          "quantidade_vendas",
                          Number(e.target.value) || 0,
                        )
                      }
                      className="w-20 rounded-md border border-chumbo/20 px-2 py-1 focus:border-brand focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-zinc-600">
                    {l.quantidade_vendas > 0 ? formatCurrency(tm) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={l.ligacoes || ""}
                      onBlur={(e) =>
                        atualizarLinha(
                          l.consultant_id,
                          "ligacoes",
                          Number(e.target.value) || 0,
                        )
                      }
                      className="w-20 rounded-md border border-chumbo/20 px-2 py-1 focus:border-brand focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum consultor cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProgressoDoDia metaGlobal={metaGlobal} vtvTotal={vtvTotal} />
    </div>
  );
}

function ProgressoDoDia({
  metaGlobal,
  vtvTotal,
}: {
  metaGlobal: number;
  vtvTotal: number;
}) {
  if (metaGlobal <= 0) {
    return (
      <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
        <p className="text-sm text-zinc-400">
          Defina a meta diária do time acima para acompanhar o progresso aqui.
        </p>
      </div>
    );
  }

  const percentual = (vtvTotal / metaGlobal) * 100;
  const percentualExibido = Math.round(percentual);
  const bateuMeta = percentual >= 100;

  return (
    <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-chumbo">Progresso do dia</p>
        <p className={`text-sm font-medium ${bateuMeta ? "text-green-700" : "text-chumbo-light"}`}>
          {formatCurrency(vtvTotal)} de {formatCurrency(metaGlobal)} ({percentualExibido}%)
          {bateuMeta && " 🎉"}
        </p>
      </div>
      <div className="mt-2 h-4 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-all ${bateuMeta ? "bg-green-600" : "bg-brand"}`}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
    </div>
  );
}
