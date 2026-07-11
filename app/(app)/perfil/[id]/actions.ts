"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setMeta(
  consultantId: string,
  ano: number,
  mes: number,
  valorMeta: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente." };

  const { error } = await supabase.from("metas_mensais").upsert(
    {
      consultant_id: consultantId,
      ano,
      mes,
      valor_meta: valorMeta,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "consultant_id,ano,mes" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/perfil/${consultantId}`);
  return { error: null };
}

export async function registerAvatar(profileId: string, storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: storagePath })
    .eq("id", profileId);

  if (error) return { error: error.message };

  revalidatePath(`/perfil/${profileId}`);
  return { error: null };
}
