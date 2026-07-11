"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  UserPlus,
  Upload,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { SignOutButton } from "./sign-out-button";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes/novo", label: "Novo cliente", icon: UserPlus },
  { href: "/importar", label: "Importar planilha", icon: Upload },
  { href: "/alertas", label: "Alertas", icon: Bell },
];

function SidebarContent({
  nome,
  role,
  avatarUrl,
  onNavigate,
}: {
  nome: string;
  role: string;
  avatarUrl: string | null;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  const navItems =
    role === "admin"
      ? [...NAV_ITEMS, { href: "/admin", label: "Consultores", icon: Users }]
      : NAV_ITEMS;

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        className="flex shrink-0 items-center px-4 pt-5 pb-3"
        onClick={onNavigate}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-branco.svg"
          alt="SeuBoné"
          width={100}
          height={24}
          style={{ width: 100, height: 24 }}
        />
      </Link>

      <Link
        href="/perfil"
        onClick={onNavigate}
        className="flex flex-col items-center gap-2 border-b border-white/10 px-4 pb-5 pt-2 hover:bg-white/5"
      >
        <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 bg-white/10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={nome}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-brand">
              {nome.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white">{nome}</p>
          {role === "admin" && <p className="text-xs text-zinc-400">admin</p>}
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand text-chumbo"
                  : "text-zinc-200 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-3 py-4">
        <SignOutButton
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10"
          icon={<LogOut size={18} />}
        />
      </div>
    </div>
  );
}

export function Sidebar({
  nome,
  role,
  avatarUrl,
}: {
  nome: string;
  role: string;
  avatarUrl: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between bg-chumbo px-4 py-3 md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-branco.svg"
          alt="SeuBoné"
          width={90}
          height={22}
          style={{ width: 90, height: 22 }}
        />
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menu"
          className="text-white"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 bg-chumbo shadow-xl">
            <div className="flex justify-end px-3 pt-3">
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fechar menu"
                className="text-white"
              >
                <X size={22} />
              </button>
            </div>
            <SidebarContent
              nome={nome}
              role={role}
              avatarUrl={avatarUrl}
              onNavigate={() => setIsOpen(false)}
            />
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-chumbo md:flex">
        <SidebarContent
          nome={nome}
          role={role}
          avatarUrl={avatarUrl}
          onNavigate={() => {}}
        />
      </aside>
    </>
  );
}
