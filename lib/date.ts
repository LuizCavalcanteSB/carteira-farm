/**
 * Formata uma coluna `date` do Postgres ("YYYY-MM-DD") como DD/MM/AAAA sem
 * passar pelo parsing UTC do `Date`, que causa um shift de -1 dia em fusos
 * horários negativos (ex: Brasil, UTC-3).
 */
export function formatDateOnly(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/** Dias entre hoje e uma data (YYYY-MM-DD): negativo se já passou, 0 se é
 * hoje, positivo se está no futuro. Compara só a data, ignora hora. */
export function diasAte(dataISO: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dataISO}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
