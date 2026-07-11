import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCnpj } from "@/lib/cnpj";
import { formatDateOnly } from "@/lib/date";
import { ClientTabs } from "./client-tabs";
import { BirthdayEditor } from "./birthday-editor";
import type { ClientStatus, PerfilComprador, Porte } from "@/lib/types";
import { PERFIL_COMPRADOR_LABEL, PORTE_LABEL } from "@/lib/labels";

const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  prospeccao: "Prospecção",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const [
    { data: stats },
    { data: notes },
    { data: orders },
    { data: photos },
    { data: links },
    { data: consultor },
  ] = await Promise.all([
    supabase.from("client_stats").select("*").eq("client_id", id).single(),
    supabase
      .from("client_notes")
      .select("*, author:profiles(nome)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*")
      .eq("client_id", id)
      .order("data_pedido", { ascending: false }),
    supabase
      .from("order_photos")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_links")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("nome").eq("id", client.consultant_id).single(),
  ]);

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await supabase.storage
        .from("client-photos")
        .createSignedUrl(photo.storage_path, 60 * 60);
      return { ...photo, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-chumbo">
            {client.nome}
          </h1>
          <p className="text-sm text-chumbo-light">
            {client.razao_social && client.razao_social !== client.nome
              ? `${client.razao_social} · `
              : ""}
            CNPJ {formatCnpj(client.cnpj)}
          </p>
        </div>
        <span className="rounded-full bg-chumbo px-3 py-1 text-xs font-medium text-brand">
          {STATUS_LABEL[client.status as ClientStatus]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Pedidos" value={String(stats?.pedidos ?? 0)} />
        <StatCard
          label="Total comprado"
          value={formatCurrency(stats?.total_comprado ?? 0)}
        />
        <StatCard
          label="Ticket médio"
          value={formatCurrency(stats?.ticket_medio ?? 0)}
        />
        <StatCard
          label="Último pedido"
          value={
            stats?.ultimo_pedido
              ? formatDateOnly(stats.ultimo_pedido)
              : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-lg border border-chumbo/10 bg-white p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Contato" value={client.contato} />
        <Field label="Comprador" value={client.comprador} />
        <Field label="Telefone" value={client.telefone} />
        <Field label="E-mail" value={client.email} />
        <Field label="Segmento" value={client.segmento} />
        <Field label="Cidade" value={client.cidade} />
        <Field label="Endereço" value={client.endereco} />
        <Field label="Situação cadastral" value={client.situacao_cadastral} />
        <Field
          label="Primeira compra"
          value={
            client.historico_primeira_compra
              ? formatDateOnly(client.historico_primeira_compra)
              : null
          }
        />
        <Field
          label="Perfil do comprador"
          value={
            client.perfil_comprador
              ? PERFIL_COMPRADOR_LABEL[client.perfil_comprador as PerfilComprador]
              : null
          }
        />
        <Field
          label="Porte"
          value={client.porte ? PORTE_LABEL[client.porte as Porte] : null}
        />
        <Field label="Consultor responsável" value={consultor?.nome} />
        <BirthdayEditor
          clientId={client.id}
          aniversarioEmpresa={client.aniversario_empresa}
        />
      </div>

      <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
        <ClientTabs
          clientId={client.id}
          notes={notes ?? []}
          orders={orders ?? []}
          photos={photosWithUrls}
          links={links ?? []}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-chumbo/10 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase text-chumbo-light">{label}</p>
      <p className="mt-1 text-lg font-semibold text-chumbo">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-0.5 text-chumbo">{value || "—"}</p>
    </div>
  );
}
