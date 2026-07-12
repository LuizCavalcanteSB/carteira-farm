"use server";

import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/cnpj";

export async function salvarPesquisaCnpj(
  cnpj: string,
  campos: { estimativa_funcionarios: string | null; eventos: string | null },
) {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return { error: "CNPJ inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("cnpj_pesquisas")
    .upsert(
      { cnpj: digits, ...campos, updated_by: user.id },
      { onConflict: "cnpj" },
    );

  if (error) return { error: error.message };
  return { error: null };
}
