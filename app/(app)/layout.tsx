import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildNotificationFeed } from "@/lib/notificacoes-feed";
import { Sidebar } from "./sidebar";
import { MainContent } from "./main-content";
import { TopBar } from "./topbar";

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
  const notifications = await buildNotificationFeed(supabase, user.id, isAdmin);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <Sidebar
        nome={profile?.nome ?? ""}
        role={profile?.role ?? "consultor"}
        avatarUrl={avatarUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar notifications={notifications} />
        <MainContent>{children}</MainContent>
      </div>
    </div>
  );
}
