"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

// Lê o estado real (setado pelo script anti-flash antes do hydration) já na
// inicialização do state, em vez de useEffect — evita um re-render extra e
// o lint de "setState em effect".
function temaEscuroAtual() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(temaEscuroAtual);

  function alternar() {
    const escuro = !isDark;
    setIsDark(escuro);
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("theme", escuro ? "dark" : "light");
  }

  return (
    <button
      onClick={alternar}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      suppressHydrationWarning
      className="flex h-9 w-9 items-center justify-center rounded-full text-chumbo hover:bg-chumbo/10 dark:text-zinc-300 dark:hover:bg-white/10"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
