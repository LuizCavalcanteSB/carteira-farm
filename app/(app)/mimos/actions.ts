"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adicionarMimo(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim() || null;
  const dataEnvio = String(formData.get("data_envio") ?? "") || null;

  if (!clientId) return { error: "Selecione um cliente." };

  const supabase = await createClient();
  const { error } = await supabase.from("mimos").insert({
    client_id: clientId,
    observacao,
    data_envio: dataEnvio,
  });

  if (error) return { error: error.message };

  revalidatePath("/mimos");
  return { error: null };
}

export async function removerMimo(mimoId: string) {
  const supabase = await createClient();
  await supabase.from("mimos").delete().eq("id", mimoId);
  revalidatePath("/mimos");
}
