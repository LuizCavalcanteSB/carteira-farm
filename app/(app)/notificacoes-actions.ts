"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function marcarNotificacaoLida(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notificacoes")
    .update({ lida_em: new Date().toISOString() })
    .eq("id", id)
    .is("lida_em", null);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}
