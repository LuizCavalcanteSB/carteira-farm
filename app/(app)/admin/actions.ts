"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setRole(profileId: string, role: "consultor" | "admin") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente." };

  if (profileId === user.id) {
    return { error: "Você não pode alterar o próprio papel." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Só administradores podem alterar papéis." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}

export async function setAtivo(profileId: string, ativo: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente." };

  if (profileId === user.id) {
    return { error: "Você não pode desativar a própria conta." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Só administradores podem desativar contas." };
  }

  if (!ativo) {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("consultant_id", profileId);

    if (count && count > 0) {
      return {
        error: `Esta pessoa ainda tem ${count} cliente(s) na carteira. Reatribua ou limpe os clientes dela (em Importar planilha → zona de perigo) antes de desativar.`,
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ativo })
    .eq("id", profileId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { error: null };
}
