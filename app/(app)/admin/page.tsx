import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleButton } from "./role-button";
import { AtivoButton } from "./ativo-button";

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

  const { data: consultores, error: consultoresError } = await supabase
    .from("profiles")
    .select("id, nome, username, role, ativo, created_at")
    .order("nome");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-white">Consultores</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Promova ou rebaixe quem tem acesso de administrador no sistema.
      </p>

      {consultoresError && (
        <p className="mt-3 text-sm text-red-400">
          Não foi possível carregar a lista: {consultoresError.message}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-chumbo-light shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {(consultores ?? []).map((c) => (
              <tr key={c.id} className="hover:bg-white/5">
                <td className="px-4 py-3 font-medium text-white">
                  <Link href={`/perfil/${c.id}`} className="hover:underline">
                    {c.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-300">{c.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.role === "admin"
                        ? "bg-brand text-chumbo"
                        : "bg-white/10 text-zinc-300"
                    }`}
                  >
                    {c.role === "admin" ? "Admin" : "Consultor"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.ativo
                        ? "bg-green-500/15 text-green-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {c.ativo ? "Ativo" : "Desativado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.id === user!.id ? (
                    <span className="text-xs text-zinc-400">você</span>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <RoleButton profileId={c.id} currentRole={c.role} />
                      <AtivoButton profileId={c.id} ativo={c.ativo} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {(consultores ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
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
