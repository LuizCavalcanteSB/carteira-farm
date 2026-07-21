"use client";

import { useRef, useState, useTransition } from "react";
import { Handshake, Info, ListChecks, PhoneCall } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addActionItem,
  addLink,
  addNote,
  addOrder,
  deleteActionItem,
  deleteLink,
  deleteNota,
  deleteOrder,
  deletePhoto,
  editarNota,
  registerPhoto,
  toggleActionItem,
} from "./actions";
import type {
  ClientActionItem,
  ClientLink,
  ClientNote,
  NotaCategoria,
  Order,
  OrderPhoto,
} from "@/lib/types";
import { diasAte, formatDateOnly } from "@/lib/date";
import { comprimirImagem } from "@/lib/image-compress";
import { contaNasEstatisticas } from "@/lib/orders";

type NoteWithAuthor = ClientNote & { author: { nome: string } | null };
type PhotoWithUrl = OrderPhoto & { url: string | null };

const MAIN_TABS = ["atividades", "registros", "antigas"] as const;
type MainTab = (typeof MAIN_TABS)[number];

const MAIN_TAB_LABEL: Record<MainTab, string> = {
  atividades: "Atividades do cliente",
  registros: "Pedidos, fotos e links Bitrix",
  antigas: "Observações antigas",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ClientTabs({
  clientId,
  notes,
  orders,
  photos,
  links,
  actionItems,
}: {
  clientId: string;
  notes: NoteWithAuthor[];
  orders: Order[];
  photos: PhotoWithUrl[];
  links: ClientLink[];
  actionItems: ClientActionItem[];
}) {
  const [tab, setTab] = useState<MainTab>("atividades");

  const notasAntigas = notes.filter((n) => !n.categoria);
  const notasCategorizadas = notes.filter(
    (n): n is NoteWithAuthor & { categoria: NotaCategoria } => !!n.categoria,
  );

  const abasVisiveis = MAIN_TABS.filter((t) => t !== "antigas" || notasAntigas.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {abasVisiveis.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t
                ? "bg-brand text-chumbo"
                : "bg-white text-zinc-600 shadow-sm hover:bg-zinc-100 dark:bg-chumbo-light dark:text-zinc-300 dark:hover:bg-white/10"
            }`}
          >
            {MAIN_TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "atividades" && (
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
          <ActivityFeed clientId={clientId} notes={notasCategorizadas} actionItems={actionItems} />
        </div>
      )}

      {tab === "registros" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
            <h3 className="mb-3 text-sm font-semibold text-chumbo dark:text-white">
              Pedidos <span className="font-normal text-zinc-400">{orders.length}</span>
            </h3>
            <OrdersTab clientId={clientId} orders={orders} />
          </div>
          <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
            <h3 className="mb-3 text-sm font-semibold text-chumbo dark:text-white">
              Fotos <span className="font-normal text-zinc-400">{photos.length}</span>
            </h3>
            <PhotosTab clientId={clientId} photos={photos} />
          </div>
          <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
            <h3 className="mb-3 text-sm font-semibold text-chumbo dark:text-white">
              Links Bitrix <span className="font-normal text-zinc-400">{links.length}</span>
            </h3>
            <LinksTab clientId={clientId} links={links} />
          </div>
        </div>
      )}

      {tab === "antigas" && (
        <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-chumbo-light">
          <LegacyNotesTab notes={notasAntigas} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Atividades: feed combinado de Plano de ação + Contato realizado +
// Pontos importantes + Rapport, sempre visível (sem precisar trocar de aba).
// ============================================================

type FeedKind = "plano_acao" | NotaCategoria;

const FEED_META: Record<
  FeedKind,
  { label: string; icon: typeof ListChecks; badge: string; borda: string; placeholder?: string }
> = {
  plano_acao: {
    label: "Plano de ação",
    icon: ListChecks,
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    borda: "border-l-amber-500",
  },
  contato_realizado: {
    label: "Contato realizado",
    icon: PhoneCall,
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
    borda: "border-l-sky-500",
    placeholder: "Ex: Liguei às 14h, cliente confirmou o pedido pra sexta",
  },
  pontos_importantes: {
    label: "Pontos importantes",
    icon: Info,
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400",
    borda: "border-l-violet-500",
    placeholder: "Ex: Vai abrir uma filial em setembro",
  },
  rapport: {
    label: "Rapport",
    icon: Handshake,
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400",
    borda: "border-l-rose-500",
    placeholder: "Ex: Comentei sobre o time dele, jogo de sábado",
  },
};

const FEED_CATEGORIAS = Object.keys(FEED_META) as FeedKind[];

type FeedEntry =
  | { kind: "plano_acao"; sortKey: number; acao: ClientActionItem }
  | { kind: NotaCategoria; sortKey: number; nota: NoteWithAuthor };

function ActivityFeed({
  clientId,
  notes,
  actionItems,
}: {
  clientId: string;
  notes: (NoteWithAuthor & { categoria: NotaCategoria })[];
  actionItems: ClientActionItem[];
}) {
  const [filtro, setFiltro] = useState<FeedKind | "todos">("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const entradas: FeedEntry[] = [
    ...actionItems.map((acao) => ({
      kind: "plano_acao" as const,
      sortKey: new Date(`${acao.data_prevista}T00:00:00`).getTime(),
      acao,
    })),
    ...notes.map((nota) => ({
      kind: nota.categoria,
      sortKey: new Date(nota.created_at).getTime(),
      nota,
    })),
  ].sort((a, b) => b.sortKey - a.sortKey);

  const contagens: Partial<Record<FeedKind, number>> = {};
  for (const e of entradas) contagens[e.kind] = (contagens[e.kind] ?? 0) + 1;

  const filtradas = filtro === "todos" ? entradas : entradas.filter((e) => e.kind === filtro);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro("todos")}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            filtro === "todos"
              ? "bg-chumbo text-white dark:bg-white dark:text-chumbo"
              : "border border-chumbo/20 text-zinc-600 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
          }`}
        >
          Tudo <span className="opacity-70">({entradas.length})</span>
        </button>
        {FEED_CATEGORIAS.map((k) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtro === k
                ? "bg-chumbo text-white dark:bg-white dark:text-chumbo"
                : "border border-chumbo/20 text-zinc-600 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
            }`}
          >
            {FEED_META[k].label} <span className="opacity-70">({contagens[k] ?? 0})</span>
          </button>
        ))}
      </div>

      <QuickAddForm clientId={clientId} />

      <ul className="flex flex-col gap-2">
        {filtradas.map((entrada) => {
          if (entrada.kind === "plano_acao") {
            return (
              <PlanoAcaoItem
                key={`plano:${entrada.acao.id}`}
                clientId={clientId}
                item={entrada.acao}
              />
            );
          }
          const nota = entrada.nota;
          const meta = FEED_META[entrada.kind];
          if (editingId === nota.id) {
            return (
              <NotaEditor
                key={nota.id}
                clientId={clientId}
                note={nota}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            );
          }
          return (
            <li
              key={nota.id}
              className={`flex gap-3 rounded-md border border-chumbo/10 border-l-4 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5 ${meta.borda}`}
            >
              <span className={`shrink-0 rounded-full px-1.5 py-1 ${meta.badge}`}>
                <meta.icon size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {meta.label}
                </p>
                <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                  {nota.conteudo}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    {nota.author?.nome ?? "—"} · {new Date(nota.created_at).toLocaleString("pt-BR")}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditingId(nota.id)}
                      className="text-xs text-chumbo hover:underline dark:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Tem certeza que deseja excluir esta anotação? Essa ação não pode ser desfeita.",
                          )
                        ) {
                          startTransition(() => deleteNota(clientId, nota.id));
                        }
                      }}
                      disabled={isPending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {filtradas.length === 0 && (
          <p className="text-sm text-zinc-500">Nada registrado ainda.</p>
        )}
      </ul>
    </div>
  );
}

function QuickAddForm({ clientId }: { clientId: string }) {
  const [categoria, setCategoria] = useState<FeedKind>("plano_acao");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-md border border-chumbo/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value as FeedKind)}
        className="mb-2 rounded-md border border-chumbo/20 bg-white px-2 py-1.5 text-xs font-medium text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
      >
        {FEED_CATEGORIAS.map((k) => (
          <option key={k} value={k}>
            {FEED_META[k].label}
          </option>
        ))}
      </select>

      {categoria === "plano_acao" ? (
        <form
          ref={formRef}
          action={(formData) =>
            startTransition(async () => {
              const result = await addActionItem(clientId, formData);
              if (result?.error) setError(result.error);
              else {
                setError(null);
                formRef.current?.reset();
              }
            })
          }
          className="flex flex-col gap-2"
        >
          <input
            type="text"
            name="objetivo"
            placeholder="Objetivo (opcional) — Ex: Reativar cliente parado há 3 meses"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="text"
              name="descricao"
              required
              placeholder="O que fazer — Ex: Ligar oferecendo desconto"
              className="min-w-[180px] flex-1 rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
            />
            <input
              type="date"
              name="data_prevista"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
            >
              {isPending ? "Salvando..." : "Adicionar"}
            </button>
          </div>
        </form>
      ) : (
        <form
          ref={formRef}
          action={(formData) =>
            startTransition(async () => {
              await addNote(clientId, categoria, formData);
              formRef.current?.reset();
            })
          }
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            name="conteudo"
            required
            placeholder={FEED_META[categoria].placeholder}
            className="min-w-0 flex-1 rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Adicionar"}
          </button>
        </form>
      )}
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function PlanoAcaoItem({
  clientId,
  item,
}: {
  clientId: string;
  item: ClientActionItem;
}) {
  const [isPending, startTransition] = useTransition();
  const meta = FEED_META.plano_acao;
  const dias = diasAte(item.data_prevista);
  const tag =
    dias < 0
      ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400"
      : dias === 0
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
        : "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400";
  const label =
    dias < 0
      ? `Atrasado há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`
      : dias === 0
        ? "Hoje"
        : `Em ${dias} dia${dias === 1 ? "" : "s"}`;

  return (
    <li
      className={`flex items-center gap-3 rounded-md border border-chumbo/10 border-l-4 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5 ${meta.borda} ${item.concluido ? "opacity-55" : ""}`}
    >
      <button
        onClick={() =>
          startTransition(() => {
            toggleActionItem(clientId, item.id, !item.concluido);
          })
        }
        disabled={isPending}
        title={item.concluido ? "Marcar como pendente" : "Marcar como concluída"}
        className={
          item.concluido
            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-chumbo disabled:opacity-50"
            : "h-5 w-5 shrink-0 rounded-full border-2 border-chumbo/30 hover:border-brand disabled:opacity-50 dark:border-white/30"
        }
      >
        {item.concluido ? "✓" : ""}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {meta.label}
        </p>
        {item.objetivo && (
          <p
            className={`text-xs font-semibold text-chumbo dark:text-white ${item.concluido ? "line-through" : ""}`}
          >
            {item.objetivo}
          </p>
        )}
        <p className={`text-sm text-zinc-700 dark:text-zinc-200 ${item.concluido ? "line-through" : ""}`}>
          {item.descricao}
        </p>
        <p className="text-xs text-zinc-500">Até {formatDateOnly(item.data_prevista)}</p>
      </div>
      {!item.concluido && (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tag}`}>{label}</span>
      )}
      <button
        onClick={() => startTransition(() => deleteActionItem(clientId, item.id))}
        disabled={isPending}
        className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        Remover
      </button>
    </li>
  );
}

function LegacyNotesTab({ notes }: { notes: NoteWithAuthor[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Observações de antes da mudança pra Contato realizado / Pontos
        importantes / Rapport — mantidas aqui só como histórico, somente leitura.
      </p>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-md border border-chumbo/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
              {note.conteudo}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {note.author?.nome ?? "—"} · {new Date(note.created_at).toLocaleString("pt-BR")}
            </p>
          </li>
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhuma observação antiga.</p>
        )}
      </ul>
    </div>
  );
}

function NotaEditor({
  clientId,
  note,
  onCancel,
  onSaved,
}: {
  clientId: string;
  note: NoteWithAuthor;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [conteudo, setConteudo] = useState(note.conteudo);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function salvar() {
    setError(null);
    startTransition(async () => {
      const result = await editarNota(clientId, note.id, conteudo);
      if (result?.error) setError(result.error);
      else onSaved();
    });
  }

  return (
    <li className="rounded-md border border-chumbo/30 p-3 dark:border-white/30">
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={3}
        autoFocus
        className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={salvar}
          disabled={isPending}
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-chumbo/20 px-3 py-1.5 text-xs font-medium text-chumbo hover:bg-zinc-50 disabled:opacity-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
        >
          Cancelar
        </button>
      </div>
    </li>
  );
}

function OrdersTab({
  clientId,
  orders,
}: {
  clientId: string;
  orders: Order[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const result = await addOrder(clientId, formData);
            if (result?.error) setError(result.error);
            else {
              setError(null);
              formRef.current?.reset();
            }
          })
        }
        className="flex flex-wrap items-end gap-3 border-b border-chumbo/10 pb-4 dark:border-white/10"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Data do pedido</label>
          <input
            type="date"
            name="data_pedido"
            required
            className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Valor (R$)</label>
          <input
            type="number"
            name="valor"
            step="0.01"
            min="0"
            required
            className="w-32 rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Descrição</label>
          <input
            type="text"
            name="descricao"
            placeholder="Ex: 200 bonés trucker personalizados"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar pedido"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-zinc-500 dark:text-zinc-400">
          <tr>
            <th className="py-2">Data</th>
            <th className="py-2">Valor</th>
            <th className="py-2">Descrição</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-white/10">
          {orders.map((order) => {
            const contabilizado = contaNasEstatisticas(order.data_pedido);
            return (
              <tr key={order.id}>
                <td className="py-2">
                  {formatDateOnly(order.data_pedido)}
                  {!contabilizado && (
                    <span
                      title="Pedido anterior ao início do controle de pedidos no sistema — já está somado no histórico do cliente e não entra nas estatísticas (Pedidos, Total comprado, Ticket médio) para evitar duplicar."
                      className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
                    >
                      não contabilizado
                    </span>
                  )}
                </td>
                <td className="py-2">{formatCurrency(order.valor)}</td>
                <td className="py-2 text-zinc-600 dark:text-zinc-300">{order.descricao || "—"}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() =>
                      startTransition(() => deleteOrder(clientId, order.id))
                    }
                    disabled={isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-zinc-500">
                Nenhum pedido registrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PhotosTab({
  clientId,
  photos,
}: {
  clientId: string;
  photos: PhotoWithUrl[];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);

    const supabase = createClient();

    for (const file of Array.from(files)) {
      const arquivo = await comprimirImagem(file);
      const path = `${clientId}/${Date.now()}-${arquivo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("client-photos")
        .upload(path, arquivo);

      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      await registerPhoto(clientId, path);
    }

    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-chumbo/10 pb-4 dark:border-white/10">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
          className="text-sm"
        />
        {isUploading && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Enviando foto(s)...</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative overflow-hidden rounded-lg border border-chumbo/10 dark:border-white/10"
          >
            {photo.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt="Foto do boné"
                className="h-40 w-full object-cover"
              />
            )}
            <button
              onClick={() =>
                startTransition(() =>
                  deletePhoto(clientId, photo.id, photo.storage_path),
                )
              }
              disabled={isPending}
              className="absolute right-1 top-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              Remover
            </button>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="col-span-full text-sm text-zinc-500">
            Nenhuma foto enviada ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function LinksTab({
  clientId,
  links,
}: {
  clientId: string;
  links: ClientLink[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            const result = await addLink(clientId, formData);
            if (result?.error) setError(result.error);
            else {
              setError(null);
              formRef.current?.reset();
            }
          })
        }
        className="flex flex-wrap items-end gap-3 border-b border-chumbo/10 pb-4 dark:border-white/10"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">URL do Bitrix</label>
          <input
            type="url"
            name="url"
            required
            placeholder="https://seubone.bitrix24.com.br/..."
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Descrição</label>
          <input
            type="text"
            name="descricao"
            placeholder="Ex: Negociação boné trucker maio/26"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar link"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center justify-between gap-3 rounded-md border border-chumbo/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
              title={link.url}
            >
              {link.descricao || link.url}
            </a>
            <button
              onClick={() => startTransition(() => deleteLink(clientId, link.id))}
              disabled={isPending}
              className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
            >
              Remover
            </button>
          </li>
        ))}
        {links.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhum link cadastrado ainda.</p>
        )}
      </ul>
    </div>
  );
}
