import { lookupCnpj, onlyDigits } from "@/lib/cnpj";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cnpj: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { cnpj } = await params;
  const digits = onlyDigits(cnpj);

  const result = await lookupCnpj(cnpj);
  if (!result) {
    return NextResponse.json(
      { error: "CNPJ não encontrado" },
      { status: 404 },
    );
  }

  // RLS de `clients` já garante que só aparece aqui se for cliente do próprio
  // consultor (ou de qualquer um, se admin) — não vaza carteira de outro.
  const [{ data: pesquisa }, { data: clienteExistente }] = await Promise.all([
    supabase
      .from("cnpj_pesquisas")
      .select("estimativa_funcionarios, eventos")
      .eq("cnpj", digits)
      .maybeSingle(),
    supabase.from("clients").select("id, nome").eq("cnpj", digits).maybeSingle(),
  ]);

  return NextResponse.json({
    ...result,
    estimativaFuncionarios: pesquisa?.estimativa_funcionarios ?? null,
    eventos: pesquisa?.eventos ?? null,
    clienteExistente: clienteExistente ?? null,
  });
}
