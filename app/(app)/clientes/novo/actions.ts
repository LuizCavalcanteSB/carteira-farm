"use server";

import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/cnpj";
import { redirect } from "next/navigation";

export async function createClientRecord(
  _prevState: unknown,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada, faça login novamente." };

  const cnpj = onlyDigits(String(formData.get("cnpj") ?? ""));
  if (cnpj.length !== 14) {
    return { error: "CNPJ inválido — deve ter 14 dígitos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const consultantId =
    profile?.role === "admin" && formData.get("consultant_id")
      ? String(formData.get("consultant_id"))
      : user.id;

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      nome: String(formData.get("nome") ?? ""),
      cnpj,
      razao_social: String(formData.get("razao_social") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      contato: String(formData.get("contato") ?? "") || null,
      comprador: String(formData.get("comprador") ?? "") || null,
      segmento: String(formData.get("segmento") ?? "") || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      cidade: String(formData.get("cidade") ?? "") || null,
      situacao_cadastral:
        String(formData.get("situacao_cadastral") ?? "") || null,
      status: String(formData.get("status") ?? "ativo"),
      perfil_comprador: String(formData.get("perfil_comprador") ?? "") || null,
      porte: String(formData.get("porte") ?? "") || null,
      aniversario_empresa:
        String(formData.get("aniversario_empresa") ?? "") || null,
      consultant_id: consultantId,
    })
    .select("id")
    .single();

  if (error) {
    return {
      error: error.code === "23505" ? "Já existe um cliente com esse CNPJ." : error.message,
    };
  }

  redirect(`/clientes/${client.id}`);
}
