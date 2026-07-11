import { createClient } from "@/lib/supabase/server";
import { PainelDiarioClient } from "./painel-client";

export default async function PainelDiarioPage() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [{ data: consultores }, { data: metaRow }, { data: linhasDb }] =
    await Promise.all([
      supabase.from("profiles").select("id, nome").order("nome"),
      supabase
        .from("painel_diario_meta")
        .select("meta_diaria")
        .eq("data", hoje)
        .maybeSingle(),
      supabase
        .from("painel_diario_consultor")
        .select("consultant_id, meta_individual, vtv, quantidade_vendas, ligacoes")
        .eq("data", hoje),
    ]);

  const linhaByConsultor = new Map(
    (linhasDb ?? []).map((l) => [l.consultant_id, l]),
  );

  const linhas = (consultores ?? []).map((c) => {
    const linha = linhaByConsultor.get(c.id);
    return {
      consultant_id: c.id,
      nome: c.nome,
      meta_individual: linha?.meta_individual ?? 0,
      vtv: linha?.vtv ?? 0,
      quantidade_vendas: linha?.quantidade_vendas ?? 0,
      ligacoes: linha?.ligacoes ?? 0,
    };
  });

  return (
    <PainelDiarioClient
      data={hoje}
      metaGlobal={metaRow?.meta_diaria ?? 0}
      linhas={linhas}
    />
  );
}
