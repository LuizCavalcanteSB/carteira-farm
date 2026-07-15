"use client";

import { useActionState, useState } from "react";
import { createClientRecord } from "./actions";
import { formatCnpj, isValidCnpjLength, onlyDigits } from "@/lib/cnpj";
import type { CnpjLookupResult } from "@/lib/cnpj";
import { formatCpf, isValidCpf, isValidCpfLength } from "@/lib/cpf";
import { PERFIL_COMPRADOR_OPTIONS, PORTE_OPTIONS } from "@/lib/labels";

export function NewClientForm({
  consultores,
}: {
  consultores?: { id: string; nome: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createClientRecord,
    undefined,
  );
  const [cnpj, setCnpj] = useState("");
  const [cpf, setCpf] = useState("");
  const [lookup, setLookup] = useState<CnpjLookupResult | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const cpfInvalido = isValidCpfLength(cpf) && !isValidCpf(cpf);

  async function handleCnpjBlur() {
    if (!isValidCnpjLength(cnpj)) return;
    setIsLooking(true);
    setLookupError(null);

    try {
      const res = await fetch(`/api/cnpj/${onlyDigits(cnpj)}`);
      if (!res.ok) {
        setLookupError("CNPJ não encontrado na Receita Federal.");
        return;
      }
      const data: CnpjLookupResult = await res.json();
      setLookup(data);
    } catch {
      setLookupError("Não foi possível consultar o CNPJ agora.");
    } finally {
      setIsLooking(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Informe CNPJ (empresa) ou CPF (pessoa física) — pelo menos um dos
        dois.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="CNPJ">
          <input
            name="cnpj"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            onBlur={handleCnpjBlur}
            placeholder="00.000.000/0000-00"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
          {isLooking && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Consultando Receita Federal...</p>
          )}
          {lookupError && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{lookupError}</p>
          )}
          {lookup && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Dados encontrados e preenchidos automaticamente.
            </p>
          )}
        </Field>

        <Field label="CPF">
          <input
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
          {cpfInvalido && (
            <p className="mt-1 text-xs text-red-400">CPF inválido.</p>
          )}
        </Field>
      </div>

      <Field label="Nome / apelido do cliente">
        <input
          name="nome"
          required
          key={lookup?.nome}
          defaultValue={lookup?.nome ?? ""}
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </Field>

      <Field label="Razão social">
        <input
          name="razao_social"
          key={lookup?.razao_social}
          defaultValue={lookup?.razao_social ?? ""}
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Telefone">
          <input
            name="telefone"
            key={lookup?.telefone}
            defaultValue={lookup?.telefone ?? ""}
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </Field>
        <Field label="E-mail">
          <input
            name="email"
            type="email"
            key={lookup?.email}
            defaultValue={lookup?.email ?? ""}
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nome do contato">
          <input
            name="contato"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </Field>
        <Field label="Comprador">
          <input
            name="comprador"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </Field>
      </div>

      <Field label="Endereço">
        <input
          name="endereco"
          key={lookup?.endereco}
          defaultValue={lookup?.endereco ?? ""}
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cidade">
          <input
            name="cidade"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </Field>
        <Field label="Segmento / atividade">
          <input
            name="segmento"
            key={lookup?.segmento}
            defaultValue={lookup?.segmento ?? ""}
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </Field>
      </div>

      <Field label="Situação cadastral">
        <input
          name="situacao_cadastral"
          key={lookup?.situacao_cadastral}
          defaultValue={lookup?.situacao_cadastral ?? ""}
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </Field>

      <Field label="Status">
        <select
          name="status"
          defaultValue="ativo"
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        >
          <option value="ativo">Ativo</option>
          <option value="prospeccao">Prospecção</option>
          <option value="inativo">Inativo</option>
        </select>
      </Field>

      <Field label="Perfil do comprador">
        <select
          name="perfil_comprador"
          defaultValue=""
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        >
          <option value="">Não informado</option>
          {PERFIL_COMPRADOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Porte">
        <select
          name="porte"
          defaultValue=""
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        >
          <option value="">Não informado</option>
          {PORTE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Data de aniversário da empresa">
        <input
          type="date"
          name="aniversario_empresa"
          className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
      </Field>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
        <p className="text-sm font-medium text-chumbo dark:text-white">
          Pedido de entrada (opcional)
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Se o cliente já fechou um pedido com você antes de entrar na
          carteira, preencha o valor e a data abaixo — o card dele já entra
          com o valor comprado e a data. Esse pedido não conta como venda
          recorrente na meta mensal.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Field label="Valor do pedido">
            <input
              type="number"
              step="0.01"
              min="0"
              name="valor_pedido_entrada"
              className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
            />
          </Field>
          <Field label="Data do pedido">
            <input
              type="date"
              name="data_pedido_entrada"
              className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
            />
          </Field>
        </div>
      </div>

      {consultores && (
        <Field label="Consultor responsável">
          <select
            name="consultant_id"
            required
            defaultValue=""
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          >
            <option value="" disabled>
              Selecione o consultor...
            </option>
            {consultores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
      )}

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar cliente"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</label>
      {children}
    </div>
  );
}
