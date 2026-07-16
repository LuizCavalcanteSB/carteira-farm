import { JWT } from "google-auth-library";

/**
 * Lê todas as linhas (cabeçalho + dados) da planilha de fechamento
 * automático, autenticando como a conta de serviço do Google configurada
 * nas variáveis de ambiente. Cada linha é um array de células na ordem em
 * que aparecem na planilha — quem chama monta o mapa nome-da-coluna → índice
 * a partir da primeira linha (ver lib/fechamento-sync.ts), então reordenar
 * colunas na planilha não quebra a sincronização.
 */
export async function lerLinhasPlanilhaFechamento(): Promise<string[][]> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEET_RANGE || "A:Z";

  if (!email || !key || !sheetId) {
    throw new Error(
      "Configuração do Google Sheets incompleta — faltam GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ou GOOGLE_SHEET_ID.",
    );
  }

  const client = new JWT({
    email,
    // a chave privada vem de uma env var de uma linha só — os "\n" literais
    // precisam virar quebra de linha de verdade antes de assinar o JWT.
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
  const res = await client.fetch<{ values?: string[][] }>(url);

  return res.data.values ?? [];
}
