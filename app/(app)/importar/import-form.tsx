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

// Importações grandes num único request estouram o tempo limite da função
// serverless (Vercel mata a função no meio, sem devolver erro nenhum pro
// navegador — o resultado é uma parte silenciosamente não importada, com a
// planilha inteira parecendo ter "sumido" sem aviso). Enviando em lotes
// pequenos, cada request termina bem dentro do limite, e dá pra mostrar
// progresso e continuar de onde parou se um lote falhar.
const TAMANHO_LOTE = 15;

export function ImportForm() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [results, setResults] = useState<ImportResultRow[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
    setImportError(null);
    const acumulado: ImportResultRow[] = [];
    setResults(acumulado);
    setProgresso({ feitos: 0, total: rows.length });

    try {
      for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
        const lote = rows.slice(i, i + TAMANHO_LOTE);
        try {
          const res = await fetch("/api/clients/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows: lote }),
          });
          if (!res.ok) {
            throw new Error(`Falha no lote (status ${res.status})`);
          }
          const data = await res.json();
          acumulado.push(...(data.results ?? []));
        } catch {
          for (const row of lote) {
            acumulado.push({
              cnpj: row.cnpj ?? "",
              nome: row.nome ?? "",
              status: "erro",
              mensagem:
                "Falha de conexão neste lote — não foi importado. Rode a importação de novo (linhas já importadas são apenas atualizadas de novo, sem duplicar).",
            });
          }
          setImportError(
            "Alguns lotes falharam por instabilidade de conexão — veja os erros marcados na lista abaixo e rode a importação de novo para tentar essas linhas.",
          );
        }
        setResults([...acumulado]);
        setProgresso({ feitos: Math.min(i + TAMANHO_LOTE, rows.length), total: rows.length });
      }
    } finally {
      setIsSubmitting(false);
      setProgresso(null);
    }
  }

  return (
    <div>
      <div className="rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="text-sm text-white"
        />
        {parseError && <p className="mt-2 text-sm text-red-400">{parseError}</p>}
      </div>

      {rows.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              {fileName} · {rows.length} linha(s) com CNPJ encontradas.
              Confira antes de importar.
            </p>
            <button
              onClick={handleImport}
              disabled={isSubmitting}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
            >
              {isSubmitting
                ? `Importando... (${progresso?.feitos ?? 0}/${progresso?.total ?? rows.length})`
                : `Importar ${rows.length} cliente(s)`}
            </button>
          </div>
          {isSubmitting && progresso && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-brand transition-all"
                style={{
                  width: `${Math.round((progresso.feitos / progresso.total) * 100)}%`,
                }}
              />
            </div>
          )}

          <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-white/10 bg-chumbo-light shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
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
              <tbody className="divide-y divide-white/10">
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-zinc-300">{row.cnpj}</td>
                    <td className="px-3 py-2 text-white">{row.nome || "—"}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.telefone || "—"}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.email || "—"}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.status || "ativo"}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.perfil_comprador || "—"}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.porte || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importError && (
        <p className="mt-4 text-sm text-red-400">{importError}</p>
      )}

      {results && (
        <div className="mt-6 rounded-lg border border-white/10 bg-chumbo-light p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-white">
            Resultado da importação
            {isSubmitting ? " (em andamento...)" : ` (${results.length}/${rows.length})`}
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {results.map((r, i) => (
              <li
                key={i}
                className={
                  r.status === "erro"
                    ? "text-red-400"
                    : r.mensagem
                      ? "text-amber-400"
                      : "text-zinc-300"
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
