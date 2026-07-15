"use client";

import { useState, useTransition } from "react";
import { atualizarInfoCliente } from "./actions";
import { PERFIL_COMPRADOR_OPTIONS, PORTE_OPTIONS } from "@/lib/labels";
import type { PerfilComprador, Porte } from "@/lib/types";

type InfoFields = {
  contato: string | null;
  comprador: string | null;
  telefone: string | null;
  email: string | null;
  segmento: string | null;
  cidade: string | null;
  endereco: string | null;
  situacao_cadastral: string | null;
  perfil_comprador: PerfilComprador | null;
  porte: Porte | null;
};

const LABELS: Record<keyof InfoFields, string> = {
  contato: "Contato",
  comprador: "Comprador",
  telefone: "Telefone",
  email: "E-mail",
  segmento: "Segmento",
  cidade: "Cidade",
  endereco: "Endereço",
  situacao_cadastral: "Situação cadastral",
  perfil_comprador: "Perfil do comprador",
  porte: "Porte",
};

const PERFIL_COMPRADOR_LABEL = Object.fromEntries(
  PERFIL_COMPRADOR_OPTIONS.map((o) => [o.value, o.label]),
) as Record<PerfilComprador, string>;

const PORTE_LABEL = Object.fromEntries(
  PORTE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Porte, string>;

export function ClientInfoEditor({
  clientId,
  info,
}: {
  clientId: string;
  info: InfoFields;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(info);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function campo<K extends keyof InfoFields>(key: K, valor: InfoFields[K]) {
    setValues((v) => ({ ...v, [key]: valor }));
  }

  function cancelar() {
    setValues(info);
    setError(null);
    setEditing(false);
  }

  function salvar() {
    setError(null);
    startTransition(async () => {
      const result = await atualizarInfoCliente(clientId, values);
      if (result?.error) setError(result.error);
      else setEditing(false);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-chumbo dark:text-white">Informações do cliente</p>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={cancelar}
              disabled={isPending}
              className="rounded-md border border-chumbo/20 px-3 py-1.5 text-xs font-medium text-chumbo hover:bg-zinc-100 disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={isPending}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-chumbo/20 px-3 py-1.5 text-xs font-medium text-chumbo hover:bg-zinc-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          >
            Editar
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {!editing && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label={LABELS.contato} value={values.contato} />
          <ReadOnlyField label={LABELS.comprador} value={values.comprador} />
          <ReadOnlyField label={LABELS.telefone} value={values.telefone} />
          <ReadOnlyField label={LABELS.email} value={values.email} />
          <ReadOnlyField label={LABELS.segmento} value={values.segmento} />
          <ReadOnlyField label={LABELS.cidade} value={values.cidade} />
          <ReadOnlyField label={LABELS.endereco} value={values.endereco} />
          <ReadOnlyField
            label={LABELS.situacao_cadastral}
            value={values.situacao_cadastral}
          />
          <ReadOnlyField
            label={LABELS.perfil_comprador}
            value={
              values.perfil_comprador
                ? PERFIL_COMPRADOR_LABEL[values.perfil_comprador]
                : null
            }
          />
          <ReadOnlyField
            label={LABELS.porte}
            value={values.porte ? PORTE_LABEL[values.porte] : null}
          />
        </div>
      )}

      {editing && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InputField
            label={LABELS.contato}
            value={values.contato}
            onChange={(v) => campo("contato", v)}
          />
          <InputField
            label={LABELS.comprador}
            value={values.comprador}
            onChange={(v) => campo("comprador", v)}
          />
          <InputField
            label={LABELS.telefone}
            value={values.telefone}
            onChange={(v) => campo("telefone", v)}
          />
          <InputField
            label={LABELS.email}
            value={values.email}
            onChange={(v) => campo("email", v)}
            type="email"
          />
          <InputField
            label={LABELS.segmento}
            value={values.segmento}
            onChange={(v) => campo("segmento", v)}
          />
          <InputField
            label={LABELS.cidade}
            value={values.cidade}
            onChange={(v) => campo("cidade", v)}
          />
          <InputField
            label={LABELS.endereco}
            value={values.endereco}
            onChange={(v) => campo("endereco", v)}
          />
          <InputField
            label={LABELS.situacao_cadastral}
            value={values.situacao_cadastral}
            onChange={(v) => campo("situacao_cadastral", v)}
          />
          <SelectField
            label={LABELS.perfil_comprador}
            value={values.perfil_comprador ?? ""}
            onChange={(v) =>
              campo("perfil_comprador", (v || null) as PerfilComprador | null)
            }
            options={PERFIL_COMPRADOR_OPTIONS}
          />
          <SelectField
            label={LABELS.porte}
            value={values.porte ?? ""}
            onChange={(v) => campo("porte", (v || null) as Porte | null)}
            options={PORTE_OPTIONS}
          />
        </div>
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 text-chumbo dark:text-white">{value || "—"}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-zinc-500 dark:text-zinc-400">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-chumbo/20 bg-white px-2 py-1.5 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase text-zinc-500 dark:text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-chumbo/20 bg-white px-2 py-1.5 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
      >
        <option value="">Não informado</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
