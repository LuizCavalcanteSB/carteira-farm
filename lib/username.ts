// O Supabase Auth exige um e-mail internamente. Para permitir login só com
// usuário/senha, geramos um e-mail sintético a partir do usuário — nunca
// exibido nem usado para envio real de e-mails.
const EMAIL_DOMAIN = "carteirafarm.internal";

export function sanitizeUsername(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD") // separa acentos das letras (á -> a + ´)
    .replace(/[^a-z0-9._-]/g, ""); // remove acentos e qualquer outro símbolo
}

export function isValidUsername(username: string) {
  return /^[a-z0-9._-]{3,32}$/.test(username);
}

export function usernameToEmail(username: string) {
  return `${sanitizeUsername(username)}@${EMAIL_DOMAIN}`;
}
