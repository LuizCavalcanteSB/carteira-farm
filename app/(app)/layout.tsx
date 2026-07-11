import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

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
    .select("id, nome, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-chumbo">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-branco.svg"
              alt="SeuBoné"
              width={115}
              height={28}
              style={{ width: 115, height: 28 }}
              className="shrink-0"
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-zinc-200 hover:text-brand">
              Dashboard
            </Link>
            <Link
              href="/clientes/novo"
              className="text-zinc-200 hover:text-brand"
            >
              Novo cliente
            </Link>
            <Link
              href="/importar"
              className="text-zinc-200 hover:text-brand"
            >
              Importar planilha
            </Link>
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="text-zinc-200 hover:text-brand"
              >
                Consultores
              </Link>
            )}
            <Link
              href="/perfil"
              className="ml-2 text-zinc-400 hover:text-brand"
            >
              {profile?.nome}
              {profile?.role === "admin" && " · admin"}
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
