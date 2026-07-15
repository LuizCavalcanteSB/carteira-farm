"use client";

import { usePathname } from "next/navigation";

// A maioria das páginas fica centralizada num max-w-6xl (leitura mais
// confortável em telas largas). O kanban de /novos-contatos precisa do
// espaço todo disponível pra caber as 5 colunas lado a lado sem rolagem.
const PAGINAS_LARGURA_TOTAL = ["/novos-contatos"];

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const larguraTotal = PAGINAS_LARGURA_TOTAL.includes(pathname);

  return (
    <main
      className={
        larguraTotal
          ? "w-full flex-1 px-6 py-8"
          : "mx-auto w-full max-w-6xl flex-1 px-6 py-8"
      }
    >
      {children}
    </main>
  );
}
