"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addLink,
  addNote,
  addOrder,
  deleteLink,
  deleteOrder,
  deletePhoto,
  editarNota,
  registerPhoto,
} from "./actions";
import type { ClientLink, ClientNote, Order, OrderPhoto } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";
import { contaNasEstatisticas } from "@/lib/orders";

type NoteWithAuthor = ClientNote & { author: { nome: string } | null };
type PhotoWithUrl = OrderPhoto & { url: string | null };

const TABS = ["observacoes", "pedidos", "fotos", "links"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  observacoes: "Observações",
  pedidos: "Pedidos",
  fotos: "Fotos",
  links: "Links Bitrix",
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
}: {
  clientId: string;
  notes: NoteWithAuthor[];
  orders: Order[];
  photos: PhotoWithUrl[];
  links: ClientLink[];
}) {
  const [tab, setTab] = useState<Tab>("observacoes");

  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t
                ? "border-b-2 border-brand text-chumbo"
                : "text-zinc-500 hover:text-chumbo"
            }`}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === "observacoes" && (
          <NotesTab clientId={clientId} notes={notes} />
        )}
        {tab === "pedidos" && <OrdersTab clientId={clientId} orders={orders} />}
        {tab === "fotos" && <PhotosTab clientId={clientId} photos={photos} />}
        {tab === "links" && <LinksTab clientId={clientId} links={links} />}
      </div>
    </div>
  );
}

function NotesTab({
  clientId,
  notes,
}: {
  clientId: string;
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
            await addNote(clientId, formData);
            formRef.current?.reset();
          })
        }
        className="flex flex-col gap-2"
      >
        <textarea
          name="conteudo"
          required
          rows={3}
          placeholder="Adicionar observação sobre este cliente..."
          className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar observação"}
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
            <li key={note.id} className="rounded-md border border-zinc-200 p-3">
              <p className="whitespace-pre-wrap text-sm text-zinc-800">
                {note.conteudo}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  {note.author?.nome ?? "—"} ·{" "}
                  {new Date(note.created_at).toLocaleString("pt-BR")}
                </p>
                <button
                  onClick={() => setEditingId(note.id)}
                  className="text-xs text-chumbo hover:underline"
                >
                  Editar
                </button>
              </div>
            </li>
          ),
        )}
        {notes.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhuma observação ainda.</p>
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
    <li className="rounded-md border border-chumbo/30 p-3">
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={3}
        autoFocus
        className="w-full rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={salvar}
          disabled={isPending}
          className="rounded-md bg-chumbo px-3 py-1.5 text-xs font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-chumbo/20 px-3 py-1.5 text-xs font-medium text-chumbo hover:bg-zinc-50 disabled:opacity-50"
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
          <label className="text-xs text-zinc-500">Data do pedido</label>
          <input
            type="date"
            name="data_pedido"
            required
            className="rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Valor (R$)</label>
          <input
            type="number"
            name="valor"
            step="0.01"
            min="0"
            required
            className="w-32 rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-zinc-500">Descrição</label>
          <input
            type="text"
            name="descricao"
            placeholder="Ex: 200 bonés trucker personalizados"
            className="w-full rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar pedido"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-zinc-500">
          <tr>
            <th className="py-2">Data</th>
            <th className="py-2">Valor</th>
            <th className="py-2">Descrição</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((order) => {
            const contabilizado = contaNasEstatisticas(order.data_pedido);
            return (
              <tr key={order.id}>
                <td className="py-2">
                  {formatDateOnly(order.data_pedido)}
                  {!contabilizado && (
                    <span
                      title="Pedido anterior ao início do controle de pedidos no sistema — já está somado no histórico do cliente e não entra nas estatísticas (Pedidos, Total comprado, Ticket médio) para evitar duplicar."
                      className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
                    >
                      não contabilizado
                    </span>
                  )}
                </td>
                <td className="py-2">{formatCurrency(order.valor)}</td>
                <td className="py-2 text-zinc-600">{order.descricao || "—"}</td>
                <td className="py-2 text-right">
                  <button
                    onClick={() =>
                      startTransition(() => deleteOrder(clientId, order.id))
                    }
                    disabled={isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Remover
                  </button>
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-zinc-400">
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
      const path = `${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("client-photos")
        .upload(path, file);

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
          <p className="mt-1 text-xs text-zinc-500">Enviando foto(s)...</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative overflow-hidden rounded-lg border border-zinc-200"
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
          <p className="col-span-full text-sm text-zinc-400">
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
          <label className="text-xs text-zinc-500">URL do Bitrix</label>
          <input
            type="url"
            name="url"
            required
            placeholder="https://seubone.bitrix24.com.br/..."
            className="w-full rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-xs text-zinc-500">Descrição</label>
          <input
            type="text"
            name="descricao"
            placeholder="Ex: Negociação boné trucker maio/26"
            className="w-full rounded-md border border-chumbo/20 px-3 py-2 text-sm focus:border-chumbo focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-chumbo px-4 py-2 text-sm font-medium text-brand hover:bg-chumbo-light disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Adicionar link"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-blue-700 hover:underline"
              title={link.url}
            >
              {link.descricao || link.url}
            </a>
            <button
              onClick={() => startTransition(() => deleteLink(clientId, link.id))}
              disabled={isPending}
              className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Remover
            </button>
          </li>
        ))}
        {links.length === 0 && (
          <p className="text-sm text-zinc-400">Nenhum link cadastrado ainda.</p>
        )}
      </ul>
    </div>
  );
}
