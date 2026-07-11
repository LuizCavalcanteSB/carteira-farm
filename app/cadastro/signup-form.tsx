"use client";

import { useActionState } from "react";
import { signUp } from "./actions";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium text-chumbo">
          Nome completo
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="name"
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-chumbo">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={32}
          autoComplete="username"
          placeholder="ex: joao.silva"
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
        <p className="text-xs text-zinc-400">
          Letras, números, ponto, traço ou underline. Sem espaços.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-chumbo">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-chumbo"
        >
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-chumbo-light disabled:opacity-50"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  );
}
