import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { limiteNotificacaoEntrega } from "@/lib/notifications";
import { Sidebar } from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nome, role, avatar_path")
    .eq("id", user.id)
    .single();

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 60 * 60);
    avatarUrl = data?.signedUrl ?? null;
  }

  const isAdmin = profile?.role === "admin";
  let notificacoesQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .not("prazo_entrega", "is", null)
    .lte("prazo_entrega", limiteNotificacaoEntrega());
  if (!isAdmin) {
    notificacoesQuery = notificacoesQuery.eq("consultant_id", user.id);
  }
  const { count: notificacoesCount } = await notificacoesQuery;

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar
        nome={profile?.nome ?? ""}
        role={profile?.role ?? "consultor"}
        avatarUrl={avatarUrl}
        notificacoesCount={notificacoesCount ?? 0}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
