"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function limparClientesDoConsultor(consultantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Só administradores podem limpar clientes." };
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("consultant_id", consultantId);
  const clientIds = (clients ?? []).map((c) => c.id);

  for (const clientId of clientIds) {
    const { data: files } = await supabase.storage
      .from("client-photos")
      .list(clientId);
    if (files && files.length > 0) {
      await supabase.storage
        .from("client-photos")
        .remove(files.map((f) => `${clientId}/${f.name}`));
    }
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("consultant_id", consultantId);

  if (error) return { error: error.message };

  revalidatePath("/importar");
  revalidatePath("/");
  return { error: null, quantidade: clientIds.length };
}
