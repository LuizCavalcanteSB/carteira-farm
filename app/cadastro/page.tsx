import Link from "next/link";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-brand px-4">
      <div className="w-full max-w-sm rounded-xl border border-chumbo/10 bg-white p-8 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-cinza.svg"
          alt="SeuBoné"
          width={131}
          height={32}
          style={{ width: 131, height: 32 }}
        />
        <p className="mt-3 text-sm text-chumbo-light">
          Crie seu login de consultor.
        </p>
        <SignUpForm />
        <p className="mt-4 text-center text-sm text-chumbo-light">
          Já tem login?{" "}
          <Link href="/login" className="font-medium text-chumbo hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
