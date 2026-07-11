import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleButton } from "./role-button";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: consultores } = await supabase
    .from("profiles")
    .select("id, nome, username, role, created_at")
    .order("nome");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-chumbo">Consultores</h1>
      <p className="mt-1 text-sm text-chumbo-light">
        Promova ou rebaixe quem tem acesso de administrador no sistema.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {(consultores ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  <Link href={`/perfil/${c.id}`} className="hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600">{c.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.role === "admin"
                        ? "bg-chumbo text-brand"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {c.role === "admin" ? "Admin" : "Consultor"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.id === user!.id ? (
                    <span className="text-xs text-zinc-400">você</span>
                  ) : (
                    <RoleButton profileId={c.id} currentRole={c.role} />
                  )}
                </td>
              </tr>
            ))}
            {(consultores ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum consultor cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
