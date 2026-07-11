"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidUsername, sanitizeUsername, usernameToEmail } from "@/lib/username";
import { redirect } from "next/navigation";

export async function signUp(_prevState: unknown, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const username = sanitizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!nome) return { error: "Informe seu nome completo." };
  if (!isValidUsername(username)) {
    return {
      error:
        "Usuário deve ter de 3 a 32 caracteres: letras, números, ponto, traço ou underline.",
    };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter ao menos 6 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();

  // O papel sempre nasce "consultor" por segurança — nunca aceito do
  // formulário. Promover alguém a admin é feito manualmente depois (ver
  // README) para não permitir auto-promoção.
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: {
      data: { nome, username, role: "consultor" },
    },
  });

  if (error) {
    const jaExiste =
      error.message.toLowerCase().includes("already registered") ||
      error.code === "user_already_exists";
    return {
      error: jaExiste
        ? "Esse usuário já está em uso."
        : "Não foi possível criar a conta agora. Tente novamente em instantes.",
    };
  }

  if (data.session) redirect("/");

  redirect("/login?cadastrado=1");
}
