import { createClient } from "@/lib/supabase/server";
import { NewClientForm } from "./new-client-form";

export default async function NewClientPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const consultores =
    profile?.role === "admin"
      ? (
          await supabase.from("profiles").select("id, nome").order("nome")
        ).data ?? []
      : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-chumbo">Novo cliente</h1>
      <p className="mt-1 text-sm text-chumbo-light">
        Digite o CNPJ para buscar os dados automaticamente na Receita Federal.
      </p>
      <div className="mt-6 rounded-lg border border-chumbo/10 bg-white p-6 shadow-sm">
        <NewClientForm consultores={profile?.role === "admin" ? consultores : undefined} />
      </div>
    </div>
  );
}
