import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sincronizarFechamentos } from "@/lib/fechamento-sync";

export async function POST(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!segredo || auth !== `Bearer ${segredo}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const resumo = await sincronizarFechamentos(supabase);
    return NextResponse.json(resumo);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
