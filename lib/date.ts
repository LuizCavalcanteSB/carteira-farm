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
 * Converte uma data de célula de planilha do Google Sheets pro formato ISO
 * usado nas colunas `date` do Postgres ("AAAA-MM-DD"). Aceita tanto
 * "DD/MM/AAAA" (formato brasileiro) quanto "AAAA-MM-DD" (ISO) — em ambos os
 * casos, ignora qualquer hora que venha grudada depois (ex: "16/07/2026
 * 14:30:00" ou "2026-07-16T14:30:00"), já que células de data-e-hora podem
 * vir formatadas assim dependendo de como a linha foi lançada na planilha.
 * Retorna `null` se o texto não bater com nenhum dos dois formatos.
 */
export function parseDataBr(valor: string): string | null {
  const texto = valor.trim();

  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T].*)?$/);
  if (br) {
    const [, dia, mes, ano] = br;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  if (iso) {
    const [, ano, mes, dia] = iso;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  return null;
}
