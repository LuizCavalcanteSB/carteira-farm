/**
 * Formata uma coluna `date` do Postgres ("YYYY-MM-DD") como DD/MM/AAAA sem
 * passar pelo parsing UTC do `Date`, que causa um shift de -1 dia em fusos
 * horários negativos (ex: Brasil, UTC-3).
 */
export function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma data no formato brasileiro ("DD/MM/AAAA", como vem de uma
 * célula de planilha do Google Sheets) para o formato ISO usado nas colunas
 * `date` do Postgres ("AAAA-MM-DD"). Retorna `null` se o texto não bater com
 * o formato esperado.
 */
export function parseDataBr(valor: string): string | null {
  const match = valor.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, dia, mes, ano] = match;
  return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}
