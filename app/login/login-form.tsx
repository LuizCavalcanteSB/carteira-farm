"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-medium text-chumbo">
          Usuário
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="password"
          className="text-sm font-medium text-chumbo"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-brand focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-chumbo-light disabled:opacity-50"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
