/**
 * Formata uma coluna `date` do Postgres ("YYYY-MM-DD") como DD/MM/AAAA sem
 * passar pelo parsing UTC do `Date`, que causa um shift de -1 dia em fusos
 * horários negativos (ex: Brasil, UTC-3).
 */
export function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
