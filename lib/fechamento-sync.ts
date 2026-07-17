import type { SupabaseClient } from "@supabase/supabase-js";
import { onlyDigits } from "./cnpj";
import { parseDataBr } from "./date";
import { lerLinhasPlanilhaFechamento } from "./google-sheets";

const COLUNAS_NECESSARIAS = [
  "Data de Venda",
  "Vendedor",
  "Nome do Cadastro",
  "Telefone do cliente",
  "Valor Produtos",
  "CPF/CNPJ",
] as const;

// não entra na lista acima porque nem toda planilha tem essa coluna — sem
// ela, o Instagram simplesmente fica em branco (ver `pegarOpcional`), em vez
// de travar a sincronização inteira por causa de uma coluna que não existe.
const COLUNA_INSTAGRAM = "Perfil do instagram do cliente";

type LinhaFechamento = {
  dataVenda: string; // ISO (AAAA-MM-DD)
  vendedor: string;
  nome: string;
  telefone: string | null;
  // null = célula em branco ou "0" — melhor não preencher histórico de
  // compra nenhum do que registrar um valor inventado/errado.
  valor: number | null;
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

/** Retorna `null` pra célula em branco, não numérica ou igual a zero —
 * nesses casos é melhor não preencher nenhum histórico de compra do que
 * registrar um valor inventado/errado (ver uso em parsearLinhasFechamento). */
function parseValorMonetario(valor: string): number | null {
  if (!valor.trim()) return null;
  const limpo = valor
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const num = Number(limpo);
  if (!Number.isFinite(num) || num === 0) return null;
  return num;
}

/** Monta o mapa "nome da coluna → índice" a partir da linha de cabeçalho,
 * normalizando (maiúsculas, sem acento, espaços colapsados) — assim a
 * sincronização não quebra se alguém reordenar colunas, mudar capitalização
 * ou tiver um espaço a mais/a menos no cabeçalho da planilha. */
function mapearColunas(cabecalho: string[]): Map<string, number> {
  const mapa = new Map<string, number>();
  cabecalho.forEach((nome, indice) => mapa.set(normalizarTexto(nome), indice));
  return mapa;
}

export type DiagnosticoPlanilha = {
  totalLinhasNaPlanilha: number;
  linhasDeVendedorPermitido: number;
  dataVendaMaisRecenteEncontrada: string | null;
  dataMinimaConfigurada: string | null;
};

/** Extrai só as linhas com CPF/CNPJ e nome válidos, junto de um diagnóstico
 * (quantas linhas bateram o filtro de vendedor antes do filtro de data, e
 * qual a venda mais recente encontrada entre elas) — ajuda a diferenciar
 * "o filtro de data tá cortando demais" de "não tem venda recente desses
 * vendedores na planilha mesmo". Pura, sem I/O, testável com uma matriz. */
export function analisarPlanilhaFechamento(matriz: string[][]): {
  linhas: LinhaFechamento[];
  diagnostico: DiagnosticoPlanilha;
} {
  const diagnostico: DiagnosticoPlanilha = {
    totalLinhasNaPlanilha: Math.max(matriz.length - 1, 0),
    linhasDeVendedorPermitido: 0,
    dataVendaMaisRecenteEncontrada: null,
    dataMinimaConfigurada: process.env.FECHAMENTO_DATA_MINIMA ?? null,
  };

  if (matriz.length === 0) return { linhas: [], diagnostico };
  const [cabecalho, ...linhas] = matriz;
  const colunas = mapearColunas(cabecalho);

  const faltando = COLUNAS_NECESSARIAS.filter((c) => !colunas.has(normalizarTexto(c)));
  if (faltando.length > 0) {
    throw new Error(
      `Planilha sem as colunas esperadas: ${faltando.join(", ")}. ` +
        `Cabeçalhos encontrados na planilha: ${cabecalho.join(" | ")}`,
    );
  }

  const pegar = (linha: string[], coluna: string) =>
    (linha[colunas.get(normalizarTexto(coluna))!] ?? "").trim();

  // como `pegar`, mas não assume que a coluna existe — devolve "" se a
  // planilha não tiver essa coluna, em vez de travar em COLUNAS_NECESSARIAS.
  const pegarOpcional = (linha: string[], coluna: string) => {
    const indice = colunas.get(normalizarTexto(coluna));
    return indice === undefined ? "" : (linha[indice] ?? "").trim();
  };

  const vendedoresPermitidos = parsearVendedoresPermitidos();
  const dataMinima = diagnostico.dataMinimaConfigurada;

  const resultado: LinhaFechamento[] = [];
  for (const linha of linhas) {
    const vendedor = pegar(linha, "Vendedor");
    if (!vendedorEhPermitido(vendedor, vendedoresPermitidos)) continue;

    diagnostico.linhasDeVendedorPermitido++;
    const dataVendaBruta = parseDataBr(pegar(linha, "Data de Venda"));
    if (
      dataVendaBruta &&
      (!diagnostico.dataVendaMaisRecenteEncontrada ||
        dataVendaBruta > diagnostico.dataVendaMaisRecenteEncontrada)
    ) {
      diagnostico.dataVendaMaisRecenteEncontrada = dataVendaBruta;
    }

    const nome = pegar(linha, "Nome do Cadastro");
    const cpfCnpjDigits = onlyDigits(pegar(linha, "CPF/CNPJ"));
    if (!nome || !cpfCnpjDigits) continue;
    if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) continue;

    const dataVenda = dataVendaBruta;
    if (!dataVenda) continue;
    // FECHAMENTO_DATA_MINIMA (ex: "2026-07-16") ignora tudo que veio antes
    // dela — evita reimportar anos de histórico da planilha de uma vez só.
    if (dataMinima && dataVenda < dataMinima) continue;

    const valor = parseValorMonetario(pegar(linha, "Valor Produtos"));

    resultado.push({
      dataVenda,
      vendedor: vendedor || "—",
      nome,
      telefone: pegar(linha, "Telefone do cliente") || null,
      valor,
      cnpj: cpfCnpjDigits.length === 14 ? cpfCnpjDigits : null,
      cpf: cpfCnpjDigits.length === 11 ? cpfCnpjDigits : null,
      instagram: pegarOpcional(linha, COLUNA_INSTAGRAM) || null,
    });
  }

  return { linhas: resultado, diagnostico };
}

/** Só as linhas válidas, sem o diagnóstico — mantido pra quem só precisa
 * disso (ex: os testes isolados já escritos pra esse parser). */
export function parsearLinhasFechamento(matriz: string[][]): LinhaFechamento[] {
  return analisarPlanilhaFechamento(matriz).linhas;
}

export type ResumoSincronizacao = {
  importados: number;
  ignorados: number;
  erros: string[];
  diagnostico: DiagnosticoPlanilha;
};

/** Lê a planilha de fechamento e cria, no Kanban de Novos Contatos, um
 * cliente sem consultor (aguardando delegação) para cada venda ainda não
 * importada — dedupe por CPF/CNPJ. Usa um cliente Supabase com service role
 * (ver lib/supabase/service.ts), já que insere sem nenhum usuário logado. */
export async function sincronizarFechamentos(
  supabase: SupabaseClient,
): Promise<ResumoSincronizacao> {
  const matriz = await lerLinhasPlanilhaFechamento();
  const { linhas, diagnostico } = analisarPlanilhaFechamento(matriz);

  const resumo: ResumoSincronizacao = { importados: 0, ignorados: 0, erros: [], diagnostico };

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
        // valor em branco/zero na planilha: não inventa histórico de
        // compra nenhum (fica no default da coluna, zerado) em vez de
        // registrar uma venda de R$ 0,00 que nunca existiu de verdade.
        ...(linha.valor !== null
          ? {
              historico_qtd_compras: 1,
              historico_faturamento_total: linha.valor,
              historico_primeira_compra: linha.dataVenda,
              historico_ultima_compra: linha.dataVenda,
            }
          : {}),
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
