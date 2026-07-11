import { lookupCnpj } from "@/lib/cnpj";
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

  const result = await lookupCnpj(cnpj);
  if (!result) {
    return NextResponse.json(
      { error: "CNPJ não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
