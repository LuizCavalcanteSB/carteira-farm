"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type ParsedRow = {
  nome?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  contato?: string;
  comprador?: string;
  segmento?: string;
  cidade?: string;
  status?: string;
  perfil_comprador?: string;
  porte?: string;
  qtd_compras?: string;
  faturamento_total?: string;
  primeira_compra?: string;
  ultima_compra?: string;
  aniversario_empresa?: string;
  consultor?: string;
};

function toISODateString(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value ?? "").trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

type ImportResultRow = {
  cnpj: string;
  nome: string;
  status: "criado" | "atualizado" | "erro";
  mensagem?: string;
};

export function ImportForm() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResultRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setResults(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheetName =
        workbook.SheetNames.find((n) => n.trim().toLowerCase() === "clientes") ??
        workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const normalized = raw.map((row) => {
        const entry: ParsedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const k = key.trim().toLowerCase();
          const v = String(value ?? "").trim();
          if (k.includes("cnpj")) entry.cnpj = v;
          else if (k.includes("nome") && !k.includes("consultor")) entry.nome = v;
          else if (k.includes("telefone") || k.includes("fone")) entry.telefone = v;
          else if (k.includes("email") || k.includes("e-mail")) entry.email = v;
          else if (k.includes("comprador")) entry.comprador = v;
          else if (k.includes("contato")) entry.contato = v;
          else if (k.includes("segmento") || k.includes("atividade")) entry.segmento = v;
          else if (k.includes("cidade")) entry.cidade = v;
          else if (k.includes("status") || k.includes("situação")) entry.status = v;
          else if (k.includes("perfil")) entry.perfil_comprador = v;
          else if (k.includes("porte")) entry.porte = v;
          else if (k.includes("qtd") && k.includes("compra")) entry.qtd_compras = v;
          else if (k.includes("faturamento")) entry.faturamento_total = v;
          else if (
            (k.includes("primeira") || k.includes("1a") || k.includes("1ª")) &&
            k.includes("compra")
          )
            entry.primeira_compra = toISODateString(value);
          else if (
            (k.includes("ultima") || k.includes("última")) &&
            k.includes("compra")
          )
            entry.ultima_compra = toISODateString(value);
          else if (
            k.includes("aniversario") ||
            k.includes("aniversário") ||
            k.includes("fundacao") ||
            k.includes("fundação")
          )
            entry.aniversario_empresa = toISODateString(value);
          else if (
            k.includes("consultor") ||
            k.includes("usuario") ||
            k.includes("usuário") ||
            k.includes("login")
          )
            entry.consultor = v;
        }
        return entry;
      });

      const withCnpj = normalized.filter((r) => r.cnpj);
      setRows(withCnpj);

      if (withCnpj.length === 0) {
        const colunas = raw.length
          ? Object.keys(raw[0]).join(", ")
          : "nenhuma";
        setParseError(
          raw.length === 0
            ? `A aba "${sheetName}" está vazia (nenhuma linha encontrada). Se sua planilha tem mais de uma aba, confira se os dados estão numa aba chamada "Clientes" ou na primeira aba do arquivo.`
            : `Lemos ${raw.length} linha(s) na aba "${sheetName}", mas nenhuma tinha uma coluna de CNPJ reconhecida. Colunas encontradas: ${colunas}.`,
        );
      }
    } catch {
      setParseError(
        "Não foi possível ler esse arquivo. Confira se é um .xlsx válido.",
      );
    }
  }

  async function handleImport() {
    setIsSubmitting(true);
    setResults(null);

    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm"
        />
        {parseError && <p className="mt-2 text-sm text-red-600">{parseError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-chumbo-light">
              {fileName} · {rows.length} linha(s) com CNPJ encontradas.
              Confira antes de importar.
            </p>
            <button
              onClick={handleImport}
              disabled={isSubmitting}
              className="rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
            >
              {isSubmitting ? "Importando..." : `Importar ${rows.length} cliente(s)`}
            </button>
          </div>

          <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-chumbo/10 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">CNPJ</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Telefone</th>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Perfil</th>
                  <th className="px-3 py-2">Porte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{row.cnpj}</td>
                    <td className="px-3 py-2">{row.nome || "—"}</td>
                    <td className="px-3 py-2">{row.telefone || "—"}</td>
                    <td className="px-3 py-2">{row.email || "—"}</td>
                    <td className="px-3 py-2">{row.status || "ativo"}</td>
                    <td className="px-3 py-2">{row.perfil_comprador || "—"}</td>
                    <td className="px-3 py-2">{row.porte || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results && (
        <div className="mt-6 rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-chumbo">
            Resultado da importação
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {results.map((r, i) => (
              <li
                key={i}
                className={
                  r.status === "erro"
                    ? "text-red-600"
                    : r.mensagem
                      ? "text-amber-600"
                      : "text-zinc-700"
                }
              >
                {r.cnpj} — {r.nome || "sem nome"}:{" "}
                {r.status === "criado" && "criado com sucesso"}
                {r.status === "atualizado" && "atualizado"}
                {r.status === "erro" && `erro (${r.mensagem})`}
                {r.status !== "erro" && r.mensagem && ` — atenção: ${r.mensagem}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
