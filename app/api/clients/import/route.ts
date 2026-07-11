import { createClient } from "@/lib/supabase/server";
import { lookupCnpj, onlyDigits } from "@/lib/cnpj";
import { sanitizeUsername } from "@/lib/username";
import { NextResponse } from "next/server";

type ImportRow = {
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

function parseNumeroBR(raw?: string): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(/[^\d,.-]/g, "");
  if (!s) return null;
  const normalizado =
    s.includes(",") && s.includes(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function isValidISODate(value?: string): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const STATUS_MAP: Record<string, string> = {
  ativo: "ativo",
  inativo: "inativo",
  prospeccao: "prospeccao",
  "prospecção": "prospeccao",
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD") // separa acentos das letras (á -> a + ´)
    .replace(/[^a-z0-9]/g, ""); // remove acentos e qualquer outro símbolo
}

const PERFIL_MAP: Record<string, string> = {
  donoousocio: "dono_socio",
  donosocio: "dono_socio",
  funcionarios: "funcionarios",
  agencia: "agencia",
  revendedor: "revendedor",
  brindeiro: "brindeiro",
};

const PORTE_MAP: Record<string, string> = {
  grande: "grande",
  medio: "medio",
  pequeno: "pequeno",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  const { rows } = (await request.json()) as { rows: ImportRow[] };

  const consultoresByUsername = isAdmin
    ? new Map(
        (
          (await supabase.from("profiles").select("id, username")).data ?? []
        ).map((c) => [c.username, c.id]),
      )
    : new Map();

  const results = [];

  for (const row of rows) {
    const cnpj = onlyDigits(row.cnpj ?? "");

    if (cnpj.length !== 14) {
      results.push({
        cnpj: row.cnpj ?? "",
        nome: row.nome ?? "",
        status: "erro",
        mensagem: "CNPJ inválido",
      });
      continue;
    }

    let nome = row.nome?.trim();
    let telefone = row.telefone?.trim() || null;
    let email = row.email?.trim() || null;
    let segmento = row.segmento?.trim() || null;
    let razao_social: string | null = null;
    let endereco: string | null = null;
    let situacao_cadastral: string | null = null;

    if (!nome || !telefone || !segmento) {
      const found = await lookupCnpj(cnpj);
      if (found) {
        nome = nome || found.nome;
        telefone = telefone || found.telefone;
        email = email || found.email;
        segmento = segmento || found.segmento;
        razao_social = found.razao_social;
        endereco = found.endereco;
        situacao_cadastral = found.situacao_cadastral;
      }
      // evita estourar o rate limit da BrasilAPI em importações grandes
      await sleep(250);
    }

    if (!nome) {
      results.push({
        cnpj,
        nome: "",
        status: "erro",
        mensagem: "Nome não informado e não encontrado na Receita Federal",
      });
      continue;
    }

    const consultorUsername = row.consultor
      ? sanitizeUsername(row.consultor)
      : "";
    const consultantId = isAdmin
      ? (consultorUsername && consultoresByUsername.get(consultorUsername)) ||
        user.id
      : user.id;
    const consultorNaoEncontrado =
      isAdmin && consultorUsername && !consultoresByUsername.has(consultorUsername);

    const { data: existing } = await supabase
      .from("clients")
      .select(
        "id, cidade, comprador, historico_qtd_compras, historico_faturamento_total, historico_primeira_compra, historico_ultima_compra, aniversario_empresa",
      )
      .eq("cnpj", cnpj)
      .maybeSingle();

    // Campos de histórico: se a planilha não trouxer a coluna nesta
    // reimportação, preserva o que já estava salvo em vez de zerar.
    const qtdCompras = row.qtd_compras
      ? Math.round(parseNumeroBR(row.qtd_compras) ?? 0)
      : (existing?.historico_qtd_compras ?? 0);
    const faturamentoTotal = row.faturamento_total
      ? (parseNumeroBR(row.faturamento_total) ?? 0)
      : (existing?.historico_faturamento_total ?? 0);
    const primeiraCompra = isValidISODate(row.primeira_compra)
      ? row.primeira_compra
      : (existing?.historico_primeira_compra ?? null);
    const ultimaCompra = isValidISODate(row.ultima_compra)
      ? row.ultima_compra
      : (existing?.historico_ultima_compra ?? null);
    const cidade = row.cidade?.trim() || existing?.cidade || null;
    const comprador = row.comprador?.trim() || existing?.comprador || null;
    const aniversarioEmpresa = isValidISODate(row.aniversario_empresa)
      ? row.aniversario_empresa
      : (existing?.aniversario_empresa ?? null);

    const { error } = await supabase.from("clients").upsert(
      {
        cnpj,
        nome,
        razao_social,
        telefone,
        email,
        contato: row.contato?.trim() || null,
        comprador,
        segmento,
        endereco,
        cidade,
        situacao_cadastral,
        status: STATUS_MAP[row.status?.trim().toLowerCase() ?? ""] ?? "ativo",
        perfil_comprador: row.perfil_comprador
          ? PERFIL_MAP[normalizeKey(row.perfil_comprador)] ?? null
          : null,
        porte: row.porte ? PORTE_MAP[normalizeKey(row.porte)] ?? null : null,
        historico_qtd_compras: qtdCompras,
        historico_faturamento_total: faturamentoTotal,
        historico_primeira_compra: primeiraCompra,
        historico_ultima_compra: ultimaCompra,
        aniversario_empresa: aniversarioEmpresa,
        consultant_id: consultantId,
      },
      { onConflict: "cnpj" },
    );

    if (error) {
      results.push({ cnpj, nome, status: "erro", mensagem: error.message });
    } else {
      results.push({
        cnpj,
        nome,
        status: existing ? "atualizado" : "criado",
        mensagem: consultorNaoEncontrado
          ? `usuário "${row.consultor}" não encontrado — cliente ficou com quem importou`
          : undefined,
      });
    }
  }

  return NextResponse.json({ results });
}
