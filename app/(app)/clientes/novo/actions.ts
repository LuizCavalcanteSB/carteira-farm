"use server";

import { createClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/cnpj";
import { isValidCpf } from "@/lib/cpf";
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

  const cnpjRaw = onlyDigits(String(formData.get("cnpj") ?? ""));
  const cpfRaw = onlyDigits(String(formData.get("cpf") ?? ""));

  if (!cnpjRaw && !cpfRaw) {
    return { error: "Informe CNPJ ou CPF." };
  }
  if (cnpjRaw && cnpjRaw.length !== 14) {
    return { error: "CNPJ inválido — deve ter 14 dígitos." };
  }
  if (cpfRaw && !isValidCpf(cpfRaw)) {
    return { error: "CPF inválido." };
  }

  const cnpj = cnpjRaw || null;
  const cpf = cpfRaw || null;

  const valorPedidoEntradaRaw = String(
    formData.get("valor_pedido_entrada") ?? "",
  ).trim();
  const dataPedidoEntrada = String(
    formData.get("data_pedido_entrada") ?? "",
  ).trim();
  const valorPedidoEntrada = valorPedidoEntradaRaw
    ? Number(valorPedidoEntradaRaw)
    : 0;

  if (valorPedidoEntrada > 0 && !dataPedidoEntrada) {
    return { error: "Informe a data do pedido de entrada." };
  }
  if (dataPedidoEntrada && !(valorPedidoEntrada > 0)) {
    return { error: "Informe o valor do pedido de entrada." };
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
      cpf,
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
      origem: "manual",
      consultant_id: consultantId,
      ...(valorPedidoEntrada > 0 && dataPedidoEntrada
        ? {
            historico_qtd_compras: 1,
            historico_faturamento_total: valorPedidoEntrada,
            historico_primeira_compra: dataPedidoEntrada,
            historico_ultima_compra: dataPedidoEntrada,
          }
        : {}),
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const campo = error.message.includes("cpf") ? "CPF" : "CNPJ";
      return { error: `Já existe um cliente com esse ${campo}.` };
    }
    return { error: error.message };
  }

  redirect(`/clientes/${client.id}`);
}
