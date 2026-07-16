import type { SupabaseClient } from "@supabase/supabase-js";
import { onlyDigits } from "./cnpj";
import { parseDataBr } from "./date";
import { lerLinhasPlanilhaFechamento } from "./google-sheets";

const COLUNAS_NECESSARIAS = [
  "Data de Venda",
  "Vendedor",
  "Nome do Cadastro",
  "Telefone do cliente",
  "Valor",
  "CPF/CNPJ",
  "Perfil do instagram do cliente",
] as const;

type LinhaFechamento = {
  dataVenda: string; // ISO (AAAA-MM-DD)
  vendedor: string;
  nome: string;
  telefone: string | null;
  valor: number;
  cnpj: string | null;
  cpf: string | null;
  instagram: string | null;
};

function parseValorMonetario(valor: string): number | null {
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const num = Number(limpo);
  return Number.isFinite(num) ? num : null;
}

/** Monta o mapa "nome da coluna → índice" a partir da linha de cabeçalho —
 * assim a sincronização não quebra se alguém reordenar colunas na planilha. */
function mapearColunas(cabecalho: string[]): Map<string, number> {
  const mapa = new Map<string, number>();
  cabecalho.forEach((nome, indice) => mapa.set(nome.trim(), indice));
  return mapa;
}

/** Extrai só as linhas com CPF/CNPJ e nome válidos — pura, sem I/O, testável
 * isoladamente com uma matriz de exemplo. */
export function parsearLinhasFechamento(matriz: string[][]): LinhaFechamento[] {
  if (matriz.length === 0) return [];
  const [cabecalho, ...linhas] = matriz;
  const colunas = mapearColunas(cabecalho);

  const faltando = COLUNAS_NECESSARIAS.filter((c) => !colunas.has(c));
  if (faltando.length > 0) {
    throw new Error(`Planilha sem as colunas esperadas: ${faltando.join(", ")}`);
  }

  const pegar = (linha: string[], coluna: string) =>
    (linha[colunas.get(coluna)!] ?? "").trim();

  const resultado: LinhaFechamento[] = [];
  for (const linha of linhas) {
    const nome = pegar(linha, "Nome do Cadastro");
    const cpfCnpjDigits = onlyDigits(pegar(linha, "CPF/CNPJ"));
    if (!nome || !cpfCnpjDigits) continue;
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) continue;

    const dataVenda = parseDataBr(pegar(linha, "Data de Venda"));
    if (!dataVenda) continue;

    const valor = parseValorMonetario(pegar(linha, "Valor"));

    resultado.push({
      dataVenda,
      vendedor: pegar(linha, "Vendedor") || "—",
      nome,
      telefone: pegar(linha, "Telefone do cliente") || null,
      valor: valor ?? 0,
      cnpj: cpfCnpjDigits.length === 14 ? cpfCnpjDigits : null,
      cpf: cpfCnpjDigits.length === 11 ? cpfCnpjDigits : null,
      instagram: pegar(linha, "Perfil do instagram do cliente") || null,
    });
  }

  return resultado;
}

export type ResumoSincronizacao = {
  importados: number;
  ignorados: number;
  erros: string[];
};

/** Lê a planilha de fechamento e cria, no Kanban de Novos Contatos, um
 * cliente sem consultor (aguardando delegação) para cada venda ainda não
 * importada — dedupe por CPF/CNPJ. Usa um cliente Supabase com service role
 * (ver lib/supabase/service.ts), já que insere sem nenhum usuário logado. */
export async function sincronizarFechamentos(
  supabase: SupabaseClient,
): Promise<ResumoSincronizacao> {
  const matriz = await lerLinhasPlanilhaFechamento();
  const linhas = parsearLinhasFechamento(matriz);

  const resumo: ResumoSincronizacao = { importados: 0, ignorados: 0, erros: [] };

  for (const linha of linhas) {
    const coluna = linha.cnpj ? "cnpj" : "cpf";
    const valorColuna = linha.cnpj ?? linha.cpf;

    const { data: existente } = await supabase
      .from("clients")
      .select("id")
      .eq(coluna, valorColuna)
      .maybeSingle();

    if (existente) {
      resumo.ignorados++;
      continue;
    }

    const { data: client, error: erroCliente } = await supabase
      .from("clients")
      .insert({
        nome: linha.nome,
        cnpj: linha.cnpj,
        cpf: linha.cpf,
        telefone: linha.telefone,
        instagram: linha.instagram,
        vendedor_externo: linha.vendedor,
        origem: "fechamento_planilha",
        na_carteira: false,
        estagio_contato: "contato_novo",
        consultant_id: null,
        historico_qtd_compras: 1,
        historico_faturamento_total: linha.valor,
        historico_primeira_compra: linha.dataVenda,
        historico_ultima_compra: linha.dataVenda,
      })
      .select("id")
      .single();

    if (erroCliente || !client) {
      resumo.erros.push(`${linha.nome}: ${erroCliente?.message ?? "erro desconhecido"}`);
      continue;
    }

    resumo.importados++;
  }

  return resumo;
}
