"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function salvarMetaGlobal(data: string, valor: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("painel_diario_meta")
    .upsert({ data, meta_diaria: valor }, { onConflict: "data" });

  if (error) return { error: error.message };
  revalidatePath("/painel");
  return { error: null };
}

type CampoConsultor = "meta_individual" | "vtv" | "quantidade_vendas" | "ligacoes";

export async function salvarCampoConsultor(
  consultantId: string,
  data: string,
  campo: CampoConsultor,
  valor: number,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("painel_diario_consultor")
    .upsert(
      { consultant_id: consultantId, data, [campo]: valor },
      { onConflict: "consultant_id,data" },
    );

  if (error) return { error: error.message };
  revalidatePath("/painel");
  return { error: null };
}
