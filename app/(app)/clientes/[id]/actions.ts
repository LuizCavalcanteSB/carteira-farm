"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addNote(clientId: string, formData: FormData) {
  const conteudo = String(formData.get("conteudo") ?? "").trim();
  if (!conteudo) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("client_notes")
    .insert({ client_id: clientId, author_id: user.id, conteudo });

  revalidatePath(`/clientes/${clientId}`);
}

export async function addOrder(clientId: string, formData: FormData) {
  const valor = Number(formData.get("valor") ?? 0);
  const data_pedido = String(formData.get("data_pedido") ?? "");
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  const supabase = await createClient();

  await supabase.from("orders").insert({
    client_id: clientId,
    valor,
    data_pedido: data_pedido || undefined,
    descricao,
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function registerPhoto(clientId: string, storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("order_photos")
    .insert({ client_id: clientId, storage_path: storagePath, uploaded_by: user.id });

  revalidatePath(`/clientes/${clientId}`);
}

export async function deletePhoto(clientId: string, photoId: string, storagePath: string) {
  const supabase = await createClient();
  await supabase.storage.from("client-photos").remove([storagePath]);
  await supabase.from("order_photos").delete().eq("id", photoId);
  revalidatePath(`/clientes/${clientId}`);
}

export async function addLink(clientId: string, formData: FormData) {
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { error: "Informe a URL do link." };

  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("client_links")
    .insert({ client_id: clientId, url, descricao });

  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`);
  return { error: null };
}

export async function deleteLink(clientId: string, linkId: string) {
  const supabase = await createClient();
  await supabase.from("client_links").delete().eq("id", linkId);
  revalidatePath(`/clientes/${clientId}`);
}
