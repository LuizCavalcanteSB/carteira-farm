import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service role key — ignora RLS completamente. Só
 * pode ser usado em rotas de confiança que não rodam no contexto de nenhum
 * usuário logado (ex: a sincronização automática da planilha de fechamento,
 * que insere clientes sem consultor definido, algo que a policy de insert
 * de `clients` não permite pra uma sessão comum). NUNCA importar isto num
 * Client Component nem devolver esta chave ao navegador.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
