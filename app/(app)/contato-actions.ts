"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ESTAGIOS_CONTATO, type EstagioContato } from "@/lib/kanban";

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

  revalidatePath("/", "layout");
  revalidatePath("/novos-contatos");
  return { error: null };
}

// Move o card entre as colunas do kanban de /novos-contatos (arrastar ou
// pelo select de fallback no card).
export async function moverEstagioContato(
  clientId: string,
  estagio: string,
) {
  if (!ESTAGIOS_CONTATO.includes(estagio as EstagioContato)) {
    return { error: "Etapa inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ estagio_contato: estagio })
    .eq("id", clientId);

  if (error) return { error: error.message };

  // Sair de "contato_novo" tira o card da notificação de novo contato no
  // sino, que roda no layout compartilhado do app.
  revalidatePath("/", "layout");
  revalidatePath("/novos-contatos");
  return { error: null };
}
