import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; cadastrado?: string }>;
}) {
  const { next, cadastrado } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-chumbo px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-chumbo-light p-8 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-branco.svg"
          alt="SeuBoné"
          width={131}
          height={32}
          style={{ width: 131, height: 32 }}
        />
        <p className="mt-3 text-sm text-zinc-400">
          Entre com seu login de consultor.
        </p>
        {cadastrado && (
          <p className="mt-3 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-400">
            Conta criada! Faça login abaixo.
          </p>
        )}
        <LoginForm next={next} />
        <p className="mt-4 text-center text-sm text-zinc-400">
          Ainda não tem login?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-brand hover:text-brand-dark hover:underline"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
