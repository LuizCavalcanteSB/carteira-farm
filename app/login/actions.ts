"use server";

import { createClient } from "@/lib/supabase/server";
import { usernameToEmail } from "@/lib/username";
import { redirect } from "next/navigation";

export async function signIn(_prevState: unknown, formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "Usuário ou senha inválidos." };
  }

  redirect(next || "/");
}
