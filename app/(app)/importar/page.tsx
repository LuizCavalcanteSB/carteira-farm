import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paginate";
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
      fetchAllRows((from, to) =>
        supabase.from("clients").select("consultant_id").range(from, to),
      ).then((r) => ({ data: r.data })),
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
      <h1 className="text-2xl font-semibold text-chumbo dark:text-white">
        Importar planilha
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Envie um .xlsx com colunas como <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">nome</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">cnpj</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">telefone</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">email</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">contato</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">comprador</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">segmento</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">cidade</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">status</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">perfil</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">porte</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">qtd compras</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">faturamento total</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">1a compra</code>, <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">última compra</code>,{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-700 dark:bg-white/10 dark:text-zinc-200">aniversário</code> (data de fundação da empresa). Só o CNPJ é
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
