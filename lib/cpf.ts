import { onlyDigits } from "./cnpj";

export { onlyDigits };

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function isValidCpfLength(value: string) {
  return onlyDigits(value).length === 11;
}

function calcCheckDigit(base: string) {
  let sum = 0;
  let weight = base.length + 1;
  for (const ch of base) {
    sum += Number(ch) * weight;
    weight--;
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** Valida o CPF pelo algoritmo oficial dos dois dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // ex: 111.111.111-11

  const base = cpf.slice(0, 9);
  const d1 = calcCheckDigit(base);
  const d2 = calcCheckDigit(base + d1);
  return cpf === `${base}${d1}${d2}`;
}
