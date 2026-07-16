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

type VendedorPermitido = { id: string; nome: string };

/** Lê a lista de vendedores cujas vendas devem entrar no Kanban, a partir de
 * `FECHAMENTO_VENDEDORES_PERMITIDOS` — formato "id:nome,id:nome,..." (ex:
 * "2576:Lucas Santos,1910:IGOR NEVES"). Sem essa env var configurada,
 * ninguém passa (falha segura — melhor não importar nada do que importar
 * vendedor errado por engano). */
function parsearVendedoresPermitidos(): VendedorPermitido[] {
  const bruto = process.env.FECHAMENTO_VENDEDORES_PERMITIDOS ?? "";
  return bruto
    .split(",")
    .map((par) => par.trim())
    .filter(Boolean)
    .map((par) => {
      const [id, ...resto] = par.split(":");
      return { id: id.trim(), nome: resto.join(":").trim() };
    });
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (á → a, ç → c, ...)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/** Verifica se o texto cru da coluna "Vendedor" bate com algum vendedor
 * permitido — reconhece o valor vindo só como ID ("2576"), só como nome
 * ("Lucas Santos") ou os dois juntos ("2576 Lucas Santos", "2576 - Lucas
 * Santos"), já que não sabemos de antemão qual formato a planilha usa. */
export function vendedorEhPermitido(
  vendedorCru: string,
  permitidos: VendedorPermitido[],
): boolean {
  if (permitidos.length === 0) return false;

  const bruto = vendedorCru.trim();
  const idExtraido = bruto.match(/^(\d+)/)?.[1];
  // se vier "2576 - Lucas Santos" ou "2576 Lucas Santos", tira o ID e o
  // separador da frente pra comparar só o nome com o que sobrou.
  const semId = bruto.replace(/^\d+\s*[-:]?\s*/, "");
  const textoNormalizado = normalizarTexto(bruto);
  const textoSemIdNormalizado = normalizarTexto(semId);

  return permitidos.some((p) => {
    if (idExtraido && p.id === idExtraido) return true;
    const nomeNormalizado = normalizarTexto(p.nome);
    if (nomeNormalizado.length === 0) return false;
    // igualdade exata (não "contém") pra "Victor Varela" não bater com
    // "Victor Varela Junior" nem com outro vendedor de nome parecido.
    return (
      textoNormalizado === nomeNormalizado || textoSemIdNormalizado === nomeNormalizado
    );
  });
}

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

  const vendedoresPermitidos = parsearVendedoresPermitidos();

  const resultado: LinhaFechamento[] = [];
  for (const linha of linhas) {
    const vendedor = pegar(linha, "Vendedor");
    if (!vendedorEhPermitido(vendedor, vendedoresPermitidos)) continue;

    const nome = pegar(linha, "Nome do Cadastro");
    const cpfCnpjDigits = onlyDigits(pegar(linha, "CPF/CNPJ"));
    if (!nome || !cpfCnpjDigits) continue;
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) continue;

    const dataVenda = parseDataBr(pegar(linha, "Data de Venda"));
    if (!dataVenda) continue;

    const valor = parseValorMonetario(pegar(linha, "Valor"));

    resultado.push({
      dataVenda,
      vendedor: vendedor || "—",
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
