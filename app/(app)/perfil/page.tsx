import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MeuPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(`/perfil/${user!.id}`);
}
