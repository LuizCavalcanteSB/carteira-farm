"use client";

import { useRef, useState, useTransition } from "react";
import {
  Archive,
  Handshake,
  Image as ImageIcon,
  Info,
  Link as LinkIcon,
  ListChecks,
  PhoneCall,
  Receipt,
} from "lucide-react";
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
import { formatDateOnly } from "@/lib/date";
import { comprimirImagem } from "@/lib/image-compress";
import { contaNasEstatisticas } from "@/lib/orders";

type NoteWithAuthor = ClientNote & { author: { nome: string } | null };
type PhotoWithUrl = OrderPhoto & { url: string | null };

const TABS = [
  "plano",
  "contato_realizado",
  "pontos_importantes",
  "rapport",
  "antigas",
  "pedidos",
  "fotos",
  "links",
] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  plano: "Plano de ação",
  contato_realizado: "Contato realizado",
  pontos_importantes: "Pontos importantes",
  rapport: "Rapport",
  antigas: "Observações antigas",
  pedidos: "Pedidos",
  fotos: "Fotos",
  links: "Links Bitrix",
};

const TAB_ICON: Record<Tab, typeof ListChecks> = {
  plano: ListChecks,
  contato_realizado: PhoneCall,
  pontos_importantes: Info,
  rapport: Handshake,
  antigas: Archive,
  pedidos: Receipt,
  fotos: ImageIcon,
  links: LinkIcon,
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
  const [tab, setTab] = useState<Tab>("plano");

  const notasAntigas = notes.filter((n) => !n.categoria);

  return (
    <div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {TABS.map((t) => {
          if (t === "antigas" && notasAntigas.length === 0) return null;
          const Icon = TAB_ICON[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-brand text-chumbo"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              }`}
            >
              <Icon size={15} />
              {TAB_LABEL[t]}
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {tab === "plano" && (
          <ActionPlanTab clientId={clientId} items={actionItems} />
        )}
        {tab === "contato_realizado" && (
          <CategoryNotesTab
            clientId={clientId}
            categoria="contato_realizado"
            placeholder="Ex: Liguei às 14h, cliente confirmou o pedido pra sexta"
            notes={notes.filter((n) => n.categoria === "contato_realizado")}
          />
        )}
        {tab === "pontos_importantes" && (
          <CategoryNotesTab
            clientId={clientId}
            categoria="pontos_importantes"
            placeholder="Ex: Vai abrir uma filial em setembro"
            notes={notes.filter((n) => n.categoria === "pontos_importantes")}
          />
        )}
        {tab === "rapport" && (
          <CategoryNotesTab
            clientId={clientId}
            categoria="rapport"
            placeholder="Ex: Comentei sobre o time dele, jogo de sábado"
            notes={notes.filter((n) => n.categoria === "rapport")}
          />
        )}
        {tab === "antigas" && <LegacyNotesTab notes={notasAntigas} />}
        {tab === "pedidos" && <OrdersTab clientId={clientId} orders={orders} />}
        {tab === "fotos" && <PhotosTab clientId={clientId} photos={photos} />}
        {tab === "links" && <LinksTab clientId={clientId} links={links} />}
      </div>
    </div>
  );
}

function CategoryNotesTab({
  clientId,
  categoria,
  placeholder,
  notes,
}: {
  clientId: string;
  categoria: NotaCategoria;
  placeholder: string;
  notes: NoteWithAuthor[];
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            await addNote(clientId, categoria, formData);
            formRef.current?.reset();
          })
        }
        className="flex flex-col gap-2"
      >
        <textarea
          name="conteudo"
          required
          rows={3}
          placeholder={placeholder}
          className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
        />
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {notes.map((note) =>
          editingId === note.id ? (
            <NotaEditor
              key={note.id}
              clientId={clientId}
              note={note}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <li key={note.id} className="rounded-md border border-chumbo/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
                {note.conteudo}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  {note.author?.nome ?? "—"} ·{" "}
                  {new Date(note.created_at).toLocaleString("pt-BR")}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingId(note.id)}
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
                        startTransition(() => deleteNota(clientId, note.id));
                      }
                    }}
                    disabled={isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ),
        )}
        {notes.length === 0 && (
          <p className="text-sm text-zinc-500">Nada registrado ainda.</p>
        )}
      </ul>
    </div>
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
        className="flex flex-wrap items-end gap-3"
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
      <div>
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
        className="flex flex-wrap items-end gap-3"
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

function diasAteData(dataISO: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${dataISO}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function ActionPlanTab({
  clientId,
  items,
}: {
  clientId: string;
  items: ClientActionItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const pendentes = items
    .filter((item) => !item.concluido)
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));
  const concluidos = items
    .filter((item) => item.concluido)
    .sort((a, b) => b.data_prevista.localeCompare(a.data_prevista));

  return (
    <div className="flex flex-col gap-4">
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
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Próxima ação</label>
          <input
            type="text"
            name="descricao"
            required
            placeholder="Ex: Ligar pra renegociar prazo"
            className="w-full rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Data</label>
          <input
            type="date"
            name="data_prevista"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-chumbo/20 bg-white px-3 py-2 text-sm text-chumbo focus:border-chumbo focus:outline-none dark:border-white/20 dark:bg-chumbo-light dark:text-white dark:focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-chumbo hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar ação"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="flex flex-col gap-2">
        {pendentes.map((item) => {
          const dias = diasAteData(item.data_prevista);
          const badge =
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
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-chumbo/10 bg-zinc-50 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <button
                onClick={() =>
                  startTransition(() => {
                    toggleActionItem(clientId, item.id, true);
                  })
                }
                disabled={isPending}
                title="Marcar como concluída"
                className="h-5 w-5 shrink-0 rounded-full border-2 border-chumbo/30 hover:border-brand disabled:opacity-50 dark:border-white/30"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-200">{item.descricao}</p>
                <p className="text-xs text-zinc-500">{formatDateOnly(item.data_prevista)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                {label}
              </span>
              <button
                onClick={() => startTransition(() => deleteActionItem(clientId, item.id))}
                disabled={isPending}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Remover
              </button>
            </li>
          );
        })}
        {pendentes.length === 0 && (
          <p className="text-sm text-zinc-500">Nenhuma ação pendente. Bom trabalho!</p>
        )}
      </ul>

      {concluidos.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500 hover:text-chumbo dark:hover:text-white">
            Concluídas ({concluidos.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {concluidos.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-md border border-chumbo/10 bg-zinc-50 p-3 opacity-60 dark:border-white/10 dark:bg-white/5"
              >
                <button
                  onClick={() =>
                    startTransition(() => {
                      toggleActionItem(clientId, item.id, false);
                    })
                  }
                  disabled={isPending}
                  title="Marcar como pendente"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs text-chumbo disabled:opacity-50"
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-700 line-through dark:text-zinc-200">
                    {item.descricao}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDateOnly(item.data_prevista)}</p>
                </div>
                <button
                  onClick={() => startTransition(() => deleteActionItem(clientId, item.id))}
                  disabled={isPending}
                  className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
