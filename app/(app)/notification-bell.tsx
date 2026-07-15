"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Cake, PhoneCall, Truck } from "lucide-react";
import type { NotificationItem } from "@/lib/notificacoes-feed";
import { marcarNotificacaoLida } from "./notificacoes-actions";

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-chumbo hover:bg-chumbo/10 dark:text-zinc-300 dark:hover:bg-white/10"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-chumbo/10 bg-white shadow-lg dark:border-white/10 dark:bg-chumbo-light">
          <div className="border-b border-chumbo/10 px-4 py-3 dark:border-white/10">
            <p className="text-sm font-semibold text-chumbo dark:text-white">
              Notificações
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">
                Nenhuma notificação por aqui.
              </p>
            )}
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/clientes/${item.clientId}`}
                onClick={() => {
                  setOpen(false);
                  void marcarNotificacaoLida(item.id);
                }}
                className="flex items-start gap-3 border-b border-chumbo/5 px-4 py-3 last:border-b-0 hover:bg-zinc-50 dark:border-white/5 dark:hover:bg-white/5"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    item.kind === "entrega"
                      ? "bg-brand/15 text-brand-dark dark:bg-brand/20 dark:text-brand"
                      : item.kind === "novo_contato"
                        ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                        : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  }`}
                >
                  {item.kind === "entrega" ? (
                    <Truck size={16} />
                  ) : item.kind === "novo_contato" ? (
                    <PhoneCall size={16} />
                  ) : (
                    <Cake size={16} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-chumbo dark:text-white">
                    {item.clientName}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {item.message}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/notificacoes"
            onClick={() => setOpen(false)}
            className="block border-t border-chumbo/10 px-4 py-2.5 text-center text-xs font-medium text-chumbo hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            Ver histórico de notificações
          </Link>
        </div>
      )}
    </div>
  );
}
