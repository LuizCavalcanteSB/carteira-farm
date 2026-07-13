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
