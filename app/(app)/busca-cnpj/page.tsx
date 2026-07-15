"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatCnpj, isValidCnpjLength, onlyDigits } from "@/lib/cnpj";
import type { Socio } from "@/lib/cnpj";
import { salvarPesquisaCnpj } from "./actions";

type ResultadoBusca = {
  cnpj: string;
  nome: string;
  razao_social: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  situacao_cadastral: string | null;
  segmento: string | null;
  porte: string | null;
  socios: Socio[];
  estimativaFuncionarios: string | null;
  eventos: string | null;
  clienteExistente: { id: string; nome: string } | null;
};

export default function BuscaCnpjPage() {
  const [cnpj, setCnpj] = useState("");
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [estimativa, setEstimativa] = useState("");
  const [eventos, setEventos] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function buscar() {
    if (!isValidCnpjLength(cnpj)) {
      setSearchError("Informe um CNPJ com 14 dígitos.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setResultado(null);
    setSaved(false);
    setSaveError(null);

    try {
      const res = await fetch(`/api/cnpj/${onlyDigits(cnpj)}`);
      if (!res.ok) {
        setSearchError(
          res.status === 404
            ? "CNPJ não encontrado na Receita Federal."
            : "Não foi possível consultar esse CNPJ agora.",
        );
        return;
      }
      const data: ResultadoBusca = await res.json();
      setResultado(data);
      setEstimativa(data.estimativaFuncionarios ?? "");
      setEventos(data.eventos ?? "");
    } catch {
      setSearchError("Não foi possível consultar esse CNPJ agora.");
    } finally {
      setIsSearching(false);
    }
  }

  function salvarAnotacoes() {
    if (!resultado) return;
    setSaveError(null);
    startTransition(async () => {
      const result = await salvarPesquisaCnpj(resultado.cnpj, {
        estimativa_funcionarios: estimativa.trim() || null,
        eventos: eventos.trim() || null,
      });
      if (result?.error) setSaveError(result.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Busca CNPJ</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Consulte qualquer CNPJ (cliente ou prospecção) e centralize dados da
          Receita Federal — sócios, porte oficial, situação cadastral — junto
          com anotações do time.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={cnpj}
          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="00.000.000/0000-00"
          className="flex-1 rounded-md border border-white/20 bg-chumbo-light px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
        />
        <button
          onClick={buscar}
          disabled={isSearching}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isSearching ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {searchError && <p className="text-sm text-red-400">{searchError}</p>}

      {resultado && (
        <div className="flex flex-col gap-4">
          {resultado.clienteExistente && (
            <div className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-white">
              Este CNPJ já é cliente:{" "}
              <Link
                href={`/clientes/${resultado.clienteExistente.id}`}
                className="font-medium underline"
              >
                {resultado.clienteExistente.nome}
              </Link>
            </div>
          )}

          <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-white">
              {resultado.nome}
            </h2>
            <p className="text-sm text-zinc-400">
              {resultado.razao_social !== resultado.nome
                ? `${resultado.razao_social} · `
                : ""}
              CNPJ {formatCnpj(resultado.cnpj)}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ReadOnly label="Situação cadastral" value={resultado.situacao_cadastral} />
              <ReadOnly label="Segmento" value={resultado.segmento} />
              <ReadOnly label="Porte (Receita Federal)" value={resultado.porte} />
              <ReadOnly label="Telefone" value={resultado.telefone} />
              <ReadOnly label="E-mail" value={resultado.email} />
              <ReadOnly label="Endereço" value={resultado.endereco} />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-white">
              Quadro de sócios
            </h3>
            {resultado.socios.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Nenhum sócio informado na Receita Federal.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {resultado.socios.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-white">{s.nome}</span>
                    {s.qualificacao && (
                      <span className="text-zinc-400"> — {s.qualificacao}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-white">
              Anotações do time
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Estimativa de funcionários e eventos não existem em nenhuma base
              pública — preencha com o que a equipe souber. Fica visível e
              editável por todos.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-zinc-400">
                  Estimativa de funcionários
                </label>
                <input
                  value={estimativa}
                  onChange={(e) => setEstimativa(e.target.value)}
                  placeholder="Ex: 10 a 20"
                  className="rounded-md border border-white/20 bg-chumbo-light px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase text-zinc-400">
                  Eventos que participa
                </label>
                <input
                  value={eventos}
                  onChange={(e) => setEventos(e.target.value)}
                  placeholder="Ex: Feira X (março), Congresso Y (setembro)"
                  className="rounded-md border border-white/20 bg-chumbo-light px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {saveError && <p className="mt-2 text-sm text-red-400">{saveError}</p>}

            <button
              onClick={salvarAnotacoes}
              disabled={isPending}
              className="mt-3 rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar anotações"}
            </button>
            {saved && <span className="ml-2 text-sm text-green-400">Salvo!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-400">{label}</p>
      <p className="mt-0.5 text-sm text-white">{value || "—"}</p>
    </div>
  );
}
