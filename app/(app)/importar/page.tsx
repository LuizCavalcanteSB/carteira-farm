import { createClient } from "@/lib/supabase/server";
import { ImportForm } from "./import-form";
import { DangerZone } from "./danger-zone";

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const isAdmin = profile?.role === "admin";

  let consultoresComContagem: { id: string; nome: string; total: number }[] = [];
  if (isAdmin) {
    const [{ data: consultores }, { data: clientes }] = await Promise.all([
      supabase.from("profiles").select("id, nome").order("nome"),
      supabase.from("clients").select("consultant_id"),
    ]);

    const totalPorConsultor = new Map<string, number>();
    for (const c of clientes ?? []) {
      totalPorConsultor.set(
        c.consultant_id,
        (totalPorConsultor.get(c.consultant_id) ?? 0) + 1,
      );
    }

    consultoresComContagem = (consultores ?? []).map((c) => ({
      id: c.id,
      nome: c.nome,
      total: totalPorConsultor.get(c.id) ?? 0,
    }));
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-chumbo">
        Importar planilha
      </h1>
      <p className="mt-1 text-sm text-chumbo-light">
        Envie um .xlsx com colunas como <code>nome</code>, <code>cnpj</code>,{" "}
        <code>telefone</code>, <code>email</code>, <code>contato</code>,{" "}
        <code>comprador</code>, <code>segmento</code>, <code>cidade</code>,{" "}
        <code>status</code>, <code>perfil</code>, <code>porte</code>,{" "}
        <code>qtd compras</code>, <code>faturamento total</code>,{" "}
        <code>1a compra</code>, <code>última compra</code>,{" "}
        <code>aniversário</code> (data de fundação da empresa). Só o CNPJ é
        obrigatório — o resto é completado automaticamente pela Receita
        Federal quando estiver em branco.
      </p>

      <div className="mt-4">
        <ImportForm />
      </div>

      {isAdmin && <DangerZone consultores={consultoresComContagem} />}
    </div>
  );
}
