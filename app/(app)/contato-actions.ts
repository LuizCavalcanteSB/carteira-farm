"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function atualizarContatoStatus(
  clientId: string,
  status: string | null,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ contato_status: status || null })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}

// Confirma o primeiro contato de um lead novo (fila /novos-contatos) e faz
// ele entrar de fato na carteira do consultor — a partir daqui passa a
// aparecer no dashboard, alertas e metas normalmente.
export async function confirmarPrimeiroContato(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ contato_status: "realizado", na_carteira: true })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/novos-contatos");
  return { error: null };
}
